/**
 * mac_cmd.js
 * 
 * Handles Generator and Decoder logic for LoRaWAN 1.0.4 MAC Commands.
 */

const MacCmd = {
    // Command Definitions (CID -> { name, upLen, downLen })
    // upLen: Bytes following CID in Uplink
    // downLen: Bytes following CID in Downlink
    DEFS: {
        '0x02': { name: 'LinkCheck', upLen: 0, downLen: 2 },     // Req(Up,0), Ans(Down,2)
        '0x03': { name: 'LinkADR', upLen: 1, downLen: 4 },       // Ans(Up,1), Req(Down,4)
        '0x04': { name: 'DutyCycle', upLen: 0, downLen: 1 },     // Ans(Up,0), Req(Down,1)
        '0x05': { name: 'RXParamSetup', upLen: 1, downLen: 4 },  // Ans(Up,1), Req(Down,4)
        '0x06': { name: 'DevStatus', upLen: 2, downLen: 0 },     // Ans(Up,2), Req(Down,0)
        '0x07': { name: 'NewChannel', upLen: 1, downLen: 5 },    // Ans(Up,1), Req(Down,5)
        '0x08': { name: 'RXTimingSetup', upLen: 0, downLen: 1 }, // Ans(Up,0), Req(Down,1)
        '0x09': { name: 'TXParamSetup', upLen: 0, downLen: 1 },  // Ans(Up,0), Req(Down,1)
        '0x0A': { name: 'DlChannel', upLen: 1, downLen: 4 },     // Ans(Up,1), Req(Down,4)
        '0x0D': { name: 'DeviceTime', upLen: 0, downLen: 5 },    // Req(Up,0), Ans(Down,5)
    },

    // --- Generator Logic ---
    generate: function (cid, isUplink, params) {
        let def = this.DEFS[cid];
        if (!def) return { error: "Unknown CID" };

        let hex = cid.replace('0x', '');

        // --- Uplink Generation (Answers mostly) ---
        if (isUplink) {
            // Note: LinkCheckReq(0x02) and DeviceTimeReq(0x0D) are Uplink but have NO payload.

            if (cid === '0x03' || cid === '0x05' || cid === '0x07' || cid === '0x0A') { // Status byte (LinkADR, RXParam, NewCh, DlCh)
                let status = 0;
                if (params.ack1) status |= (1 << 0);
                if (params.ack2) status |= (1 << 1);
                if (params.ack3) status |= (1 << 2);
                hex += this.toHex(status, 1);
            }
            else if (cid === '0x06') { // DevStatusAns -> Battery(1), SNR(1)
                hex += this.toHex(params.battery || 0, 1);
                // SNR is signed 6-bit (-32..31) in lower 6 bits
                let snr = parseInt(params.snr || 0);
                if (snr < 0) snr += 64; // Two's complement for 6 bits? No, spec says "signed integer". Assuming standard casting.
                // Spec says: "00111111" = 63? No, range is -32 to 31.
                // 31 = 0x1F. -32 = 0x20 (bit 5 is sign).
                // Let's simpler logic: mask to 6 bits.
                hex += this.toHex(snr & 0x3F, 1);
            }
        }
        // --- Downlink Generation (Requests mostly, but LinkCheck/DevTime Ans are Downlink) ---
        else {
            if (cid === '0x02') { // LinkCheckAns -> Margin(1), GwCnt(1)
                hex += this.toHex(params.margin || 0, 1);
                hex += this.toHex(params.gwCnt || 1, 1);
            }
            else if (cid === '0x03') { // LinkADRReq -> DR_POW(1), Mask(2), Redun(1)
                let drPow = ((params.dr & 0xF) << 4) | (params.txPower & 0xF);
                hex += this.toHex(drPow, 1);
                hex += this.toHex(params.chMask, 2, true); // LSB
                let redun = ((params.chMaskCntl & 0x7) << 4) | (params.nbTrans & 0xF);
                hex += this.toHex(redun, 1);
            }
            else if (cid === '0x04') { // DutyCycleReq -> MaxDC(1)
                hex += this.toHex(params.maxDC & 0xF, 1);
            }
            else if (cid === '0x05') { // RXParamSetupReq -> DLSettings(1), Freq(3)
                let dlSet = ((params.rx1DrOff & 0x7) << 4) | (params.rx2DataRate & 0xF);
                hex += this.toHex(dlSet, 1);
                hex += this.toHex(params.freq, 3, true); // LSB
            }
            else if (cid === '0x07') { // NewChannelReq -> Idx(1), Freq(3), DR(1)
                hex += this.toHex(params.chIndex, 1);
                hex += this.toHex(params.freq, 3, true);
                let dr = ((params.maxDr & 0xF) << 4) | (params.minDr & 0xF);
                hex += this.toHex(dr, 1);
            }
            else if (cid === '0x08') { // RXTimingSetupReq -> Settings(1)
                hex += this.toHex(params.delay & 0xF, 1);
            }
            else if (cid === '0x09') { // TXParamSetupReq -> EIRP_Dwell(1)
                let val = ((params.dlDwell ? 1 : 0) << 5) | ((params.ulDwell ? 1 : 0) << 4) | (params.maxEirp & 0xF);
                hex += this.toHex(val, 1);
            }
            else if (cid === '0x0A') { // DlChannelReq -> Idx(1), Freq(3)
                hex += this.toHex(params.chIndex, 1);
                hex += this.toHex(params.freq, 3, true);
            }
            else if (cid === '0x0D') { // DeviceTimeAns -> GPS(4), Frac(1)
                hex += this.toHex(params.seconds || 0, 4, true); // LE
                hex += this.toHex(params.frac || 0, 1);
            }
        }

        return hex.toUpperCase();
    },

    // --- Decoder Logic ---
    decode: function (hexStr, isUplink) {
        if (!hexStr) return { commands: [], error: "Empty Input" };
        hexStr = hexStr.replace(/\s+/g, '');
        let bytes = [];
        for (let i = 0; i < hexStr.length; i += 2) bytes.push(parseInt(hexStr.substr(i, 2), 16));

        let ptr = 0;
        let cmds = [];
        let error = null;

        while (ptr < bytes.length) {
            let cid = bytes[ptr++];
            let cidHex = '0x' + cid.toString(16).toUpperCase().padStart(2, '0');
            let def = this.DEFS[cidHex];

            if (!def) {
                // Proprietary or Invalid
                if (cid >= 0x80) {
                    // Assume proprietary? Unknown length. Stop.
                    cmds.push({ cid: cidHex, name: "Proprietary/Unknown", params: {}, raw: bytes.slice(ptr - 1) });
                    break;
                }
                error = `Unknown CID ${cidHex} at byte ${ptr - 1}`;
                break;
            }

            // Determine Length based on Direction
            // def.upLen is for Uplink, def.downLen is for Downlink
            let len = isUplink ? def.upLen : def.downLen;

            if (ptr + len > bytes.length) {
                error = `Truncated payload for ${def.name}. Needed ${len} bytes, has ${bytes.length - ptr}`;
                break;
            }

            // Extract Payload Bytes
            let payload = bytes.slice(ptr, ptr + len);
            ptr += len;

            // Decode Parameters based on CID
            let params = this.decodePayload(cidHex, payload, isUplink);

            cmds.push({
                cid: cidHex,
                name: def.name,
                len: len,
                params: params,
                raw: [cid, ...payload]
            });
        }

        return { commands: cmds, error: error };
    },

    decodePayload: function (cid, bytes, isUplink) {
        let p = {};
        if (isUplink) {
            // --- UPLINK (Ans) ---
            // LinkCheckReq (0x02) is Up (Empty)
            // DeviceTimeReq (0x0D) is Up (Empty)

            if (cid === '0x03' || cid === '0x05' || cid === '0x07' || cid === '0x0A') {
                let status = bytes[0];
                p.PowerAck = (status & 1) ? 1 : 0;
                p.DRAck = (status & 2) ? 1 : 0;
                p.ChMaskAck = (status & 4) ? 1 : 0;
                // Note: bits meaning vary slightly by command, but generally ACK bits
                if (cid === '0x07') { p.DrRangeAck = p.DRAck; delete p.DRAck; delete p.PowerAck; } // NewChannel
            }
            else if (cid === '0x06') { // DevStatusAns
                p.Battery = bytes[0]; // 0=Ext, 255=Unk
                // Spec: "margin is the demodulation SNR in dB rounded to nearest integer... range -32..31"
                // It's a signed 6-bit integer.
                let rawSnr = bytes[1] & 0x3F;
                if (rawSnr > 31) rawSnr -= 64;
                p.SNR = rawSnr + " dB";
            }
            else if (cid === '0x0D') {
                // DeviceTimeReq (Up) is Empty!
            }
        }
        else {
            // --- DOWNLINK (Req/Ans) ---
            if (cid === '0x02') { // LinkCheckAns
                p.Margin = bytes[0] + " dB";
                p.GwCnt = bytes[1];
            }
            else if (cid === '0x03') { // LinkADRReq
                p.DR = (bytes[0] >> 4) & 0xF;
                p.TXPower = bytes[0] & 0xF;
                p.ChMask = "0x" + (bytes[1] | (bytes[2] << 8)).toString(16).toUpperCase();
                p.NbTrans = bytes[3] & 0xF;
                p.ChMaskCntl = (bytes[3] >> 4) & 0x7;
            }
            else if (cid === '0x05') { // RXParamSetupReq
                p.RX1DROffset = (bytes[0] >> 4) & 0x7;
                p.RX2DR = bytes[0] & 0xF;
                p.Freq = ((bytes[1]) | (bytes[2] << 8) | (bytes[3] << 16)) * 100;
            }
            else if (cid === '0x0D') { // DeviceTimeAns
                let seconds = (bytes[0]) | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
                p.GPSSeconds = seconds >>> 0;
                p.Fraction = bytes[4];
            }
            else if (cid === '0x04') { // DutyCycleReq
                p.MaxDC = (bytes[0] & 0xF);
            }
            else if (cid === '0x07') { // NewChannelReq
                p.ChIndex = bytes[0];
                p.Freq = ((bytes[1]) | (bytes[2] << 8) | (bytes[3] << 16)) * 100;
                p.MaxDR = (bytes[4] >> 4) & 0xF;
                p.MinDR = bytes[4] & 0xF;
            }
            else if (cid === '0x08') { // RXTimingSetupReq
                p.Delay = (bytes[0] & 0xF);
            }
            else if (cid === '0x09') { // TXParamSetupReq
                p.DownlinkDwell = (bytes[0] & 0x20) ? 1 : 0;
                p.UplinkDwell = (bytes[0] & 0x10) ? 1 : 0;
                p.MaxEIRP = (bytes[0] & 0xF);
            }
            else if (cid === '0x0A') { // DlChannelReq
                p.ChIndex = bytes[0];
                p.Freq = ((bytes[1]) | (bytes[2] << 8) | (bytes[3] << 16)) * 100;
            }
        }
        return p;
    },

    toHex: function (val, bytes, littleEndian = false) {
        let hex = "";
        for (let i = 0; i < bytes; i++) {
            let byte = littleEndian ? (val >> (i * 8)) & 0xFF : (val >> ((bytes - 1 - i) * 8)) & 0xFF;
            hex += byte.toString(16).toUpperCase().padStart(2, '0');
        }
        return hex;
    }
};
