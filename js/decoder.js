/**
 * Advantech LoRa Downlink Decoder
 * Reverse-engineers Hex strings back to Command Parameters
 */

const DownlinkDecoder = {
    /**
     * Decode Hex String
     * @param {string} hexStr - e.g. "80000550000505..."
     * @returns {Object} { error, header, payload, cmdName, params: {} }
     */
    decode: function (hexStr) {
        // 1. Basic Cleaning & Validation
        hexStr = hexStr.replace(/\s+/g, '').toUpperCase();
        if (!/^[0-9A-F]+$/.test(hexStr)) return { error: "Invalid Hex String" };
        if (hexStr.length < 8) return { error: "Length too short" };
        if (hexStr.length % 2 !== 0) return { error: "Odd number of characters" };

        let bytes = [];
        for (let i = 0; i < hexStr.length; i += 2) bytes.push(parseInt(hexStr.substr(i, 2), 16));

        // 2. Validate Header (Byte 0 = 0x80)
        // Spec Line 20: WHDR = 0x80 usually
        if (bytes[0] !== 0x80) {
            // Soft warning, or just proceed? Advantech usually uses 0x80.
            // Let's note it but proceed.
        }

        let seq = bytes[1];
        let len = bytes[2];

        // Validate Length (Byte 2 is length of following payload + CRC?)
        // Generator logic: head(3) + payload(N) + crc(1).
        // Generator: let head = [0x80, seq, payload.length];
        // So Byte 2 is length of (Byte 3 ... End-1).
        // Total bytes = 3 + len + 1.
        if (bytes.length !== 3 + len + 1) {
            return { error: `Length mismatch. Header says ${len} bytes payload, but found ${bytes.length - 4}` };
        }

        let checksum = bytes[bytes.length - 1]; // Last byte
        let payloadBytes = bytes.slice(3, bytes.length - 1);

        // 3. Validate CRC (Optional but good)
        // Generator CRC covers payloadBytes.
        let calcCrc = 0xFF;
        for (let b of payloadBytes) {
            calcCrc ^= b;
            for (let k = 0; k < 8; k++) {
                calcCrc = (calcCrc & 0x80) ? ((calcCrc << 1) ^ 0x07) : (calcCrc << 1);
            }
            calcCrc &= 0xFF;
        }
        if (calcCrc !== checksum) {
            // return { error: `Invalid Checksum. Expected ${calcCrc.toString(16).toUpperCase()}, Found ${checksum.toString(16).toUpperCase()}` };
            // Allow viewing even if CRC bad, but warn?
            // For strictness, let's return error for now.
            return { error: `Invalid Checksum (Exp: ${calcCrc.toString(16).toUpperCase().padStart(2, '0')})` };
        }

        // 4. Parse Payload Header
        // Payload: [Byte1 (Type/Ch), (Mask?), SegLen, CmdId, ...Data]
        let ptr = 0;
        let byte1 = payloadBytes[ptr++];

        // Identify Type
        // 0x5_ : Sensor
        // 0x6_ : Device
        // 0x0_, 0x1_, 0x3_ : I/O
        // 0x7_, 0x8_ : RS485

        let typeNibble = (byte1 & 0xF0) >> 4;
        let subNibble = (byte1 & 0x0F);

        let realType = "";
        let chInfo = {};
        let mask = 0;

        // Matching logic from Generator
        if (typeNibble === 0x5) {
            // Sensor
            // Byte 1 Low Nibble is range
            let range = subNibble; // 0 or 4 
            realType = (range === 4) ? "0x5_4" : "0x5_0";

            // Next byte logic
            // Generator 0x5_4 (Accel): byte1, mask, segLen...
            // Generator 0x5_0 (Temp): byte1, mask, segLen...
            // In Generator: mask is pushed for both 0x5 types.
            if (ptr >= payloadBytes.length) return { error: "Payload too short for Sensor" };
            mask = payloadBytes[ptr++];
            // Accel Mask decoding? Done later in params
        }
        else if (typeNibble === 0x6) {
            // Device
            realType = "0x6";
            // No channel/mask byte for 0x6 in Generator logic?
            // Generator: `let payload = [byte1, segLen, cmdId, ...pData];`
            // So NO mask byte.
        }
        else if (typeNibble === 0x7 || typeNibble === 0x8) {
            // RS485
            realType = `0x${typeNibble}`;
            // Generator: `let byteCh = (port << 7) | (chL & 0x7F);`
            // `payload = [byte1, byteCh, segLen, cmdId, ...]`
            if (ptr >= payloadBytes.length) return { error: "Payload too short for RS485" };
            let byteCh = payloadBytes[ptr++];
            chInfo.port = (byteCh >> 7) & 1;
            chInfo.chIndex = byteCh & 0x7F;
        }
        else {
            // I/O: 0x0, 0x1, 0x3
            realType = `0x${typeNibble}`;
            // Generator: `payload = [byte1, segLen, cmdId, ...]`
            // subNibble is channel index.
            chInfo.chIndex = subNibble;
        }

        // Next is SegLen (Segment Length) - Usually 1 + DataLen
        // But we can just read CmdId and verify DEFS.
        if (ptr >= payloadBytes.length) return { error: "Missing Segment Length" };
        let segLen = payloadBytes[ptr++];

        if (ptr >= payloadBytes.length) return { error: "Missing Command ID" };
        let cmdId = payloadBytes[ptr++];

        // 5. Lookup Command in DEFS
        // We need to find the Key in DEFS based on cmdId
        // generator.js: DEFS[realType][key] -> { cmdId: N }

        if (typeof DownlinkGenerator !== 'undefined' && DownlinkGenerator.DEFS) {
            // Global access assumed
        } else {
            return { error: "Generator definitions not found" };
        }

        let defs = DownlinkGenerator.DEFS[realType];
        if (!defs) return { error: `Unknown Type Code: 0x${typeNibble.toString(16)} (Real: ${realType})` };

        let matchedKey = null;
        let matchedConf = null;

        for (let k in defs) {
            let conf = defs[k];
            // Special handling for subType in 0x6 (Device)
            // Generator 0x6: byte1 low nibble is subType.
            // `low = conf.subType`
            if (realType === "0x6") {
                if (conf.cmdId === cmdId && conf.subType === subNibble) {
                    matchedKey = k;
                    matchedConf = conf;
                    break;
                }
            } else {
                if (conf.cmdId === cmdId) {
                    matchedKey = matchedConf = k;
                    matchedConf = conf;
                    break;
                }
            }
        }

        if (!matchedConf) {
            return {
                error: null,
                header: { type: realType, seq: seq, len: len },
                cmdName: `Unknown Command (ID: ${cmdId})`,
                params: { raw: this.toHex(payloadBytes.slice(ptr)) }
            };
        }

        // 6. Decode Parameters
        let dataLen = (payloadBytes.length - ptr); // Remaining bytes
        let dataBytes = payloadBytes.slice(ptr);
        let params = {};

        try {
            this.decodeData(dataBytes, matchedConf, params, mask);
        } catch (e) {
            params._error = "Decoding failed: " + e;
        }

        // Add context info
        if (realType.startsWith('0x5')) {
            if (realType === '0x5_4') {
                // Decode Accel Mask
                let axes = [];
                if (mask & 0x80) axes.push('Z');
                if (mask & 0x40) axes.push('Y');
                if (mask & 0x20) axes.push('X');
                params._target = "Accel Axes: " + (axes.length ? axes.join(',') : 'None');
            } else {
                params._target = "Sensor Mask: " + mask; // Though user requested fixed 0, might receive others
            }
        } else if (chInfo.chIndex !== undefined) {
            params._target = "Channel: " + chInfo.chIndex;
        }

        return {
            error: null,
            header: { seq: seq, len: len, type: realType },
            cmdName: matchedConf.name,
            params: params
        };
    },

    decodeData: function (bytes, conf, out, mask) {
        let ptr = 0;
        const read8 = () => bytes[ptr++];
        const read16 = () => { let v = (bytes[ptr + 1] << 8) | bytes[ptr]; ptr += 2; return (v & 0x8000) ? v - 0x10000 : v; }; // Signed Little Endian usually for values?
        // Generator uses TypedArrays. Uint16Array uses system endianness (usually Little Endian).
        // Let's assume Little Endian generally.
        // Generator: new Int16Array([val]).buffer -> Uint8Array
        // Yes, Little Endian.
        const read16u = () => { let v = (bytes[ptr + 1] << 8) | bytes[ptr]; ptr += 2; return v; };
        const read32 = () => { let v = (bytes[ptr + 3] << 24) | (bytes[ptr + 2] << 16) | (bytes[ptr + 1] << 8) | bytes[ptr]; ptr += 4; return v; };
        const read32u = () => { let v = (bytes[ptr + 3] << 24) | (bytes[ptr + 2] << 16) | (bytes[ptr + 1] << 8) | bytes[ptr]; ptr += 4; return v >>> 0; };

        if (conf.type === 'fixed') {
            if (conf.len > 0) {
                let val = (conf.len === 4) ? read32() : ((conf.len === 2) ? read16() : read8());
                out.Value = val;
                if (val !== conf.val) out.Value += ` (Exp: ${conf.val})`;
            }
            return;
        }
        else if (conf.type === 'fixed_hex') {
            let hex = "";
            // Read len bytes
            for (let k = 0; k < conf.len; k++) hex += read8().toString(16).toUpperCase().padStart(2, '0');
            out.Value = `0x${hex}`;

            // Try ASCII for RST
            if (conf.hex === "525354") out.Value += " (RST)";

            if (hex !== conf.hex) out.Warning = `Mismatch (Exp: 0x${conf.hex})`;
            return;
        }

        if (conf.type === 'schedule') {
            // Mode(1), Mask(1), SH(1), SM(1), EH(1), EM(1), Int(4)
            // Generator: `pData.push(mode, mask, sH, sM, eH, eM, ...u32)`
            out.Mode = read8();
            let dMask = read8();
            let days = [];
            ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((d, i) => { if (dMask & (1 << i)) days.push(d); });
            out.Days = days.join(',');

            out.Start = `${read8()}:${read8().toString().padStart(2, '0')}`;
            out.End = `${read8()}:${read8().toString().padStart(2, '0')}`;
            out.Interval = read32u() + ' sec';
        }
        else if (conf.type === 'bitmask') {
            let val = (conf.len === 2) ? read16u() : read8();
            let feats = [];
            conf.options.forEach(o => {
                if (val & (1 << o.b)) feats.push(o.l);
            });
            out.Selected = feats.join(', ') || "None";
            out.Raw = "0x" + val.toString(16).toUpperCase();
        }
        else if (conf.type === 'composite') {
            conf.parts.forEach(p => {
                let val;
                if (p.len === 1) val = read8();
                else if (p.len === 2) val = read16u(); // Assuming unsigned for indices/sizes usually?
                else if (p.len === 4) {
                    val = (p.type === 'number') ? read32u() : read32u(); // IDs usually unsigned
                }

                if (p.type === 'datetime') {
                    // val is unix timestamp
                    out[p.label] = new Date(val * 1000).toISOString().replace('T', ' ').substr(0, 19);
                } else {
                    out[p.label] = val;
                }
            });
        }
        else if (conf.type === 'string') {
            // ASCII
            let s = "";
            while (ptr < bytes.length) s += String.fromCharCode(read8());
            out.Value = s;
        }
        else if (conf.type === 'datetime') { // 32bit u
            let ts = read32u();
            out.Date = new Date(ts * 1000).toISOString().replace('T', ' ').substr(0, 19);
        }
        else if (conf.type === 'float') { // Scaled integer
            let raw = (conf.len === 4) ? read32() : read16(); // Signed
            let val = raw / conf.scale;
            out.Value = val;
        }
        else if (conf.type === 'number') {
            // Depending on Desc implies signed/unsigned?
            // Generator uses Int32Array/Int16Array -> Signed.
            let val = (conf.len === 4) ? read32() : ((conf.len === 2) ? read16() : read8());
            out.Value = val;
            if (conf.unit) out.Value += " " + conf.unit;
        }
        else if (conf.type === 'select') {
            let val = read8(); // Usually len 1
            out.Value = conf.opts[val] || val;
        }
    },

    toHex: function (arr) {
        return Array.from(arr).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');
    }
};
