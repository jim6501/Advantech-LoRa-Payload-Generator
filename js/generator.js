/**
 * Advanetch LoRa Downlink Generator
 * Based on Payload Format Spec v1.36
 */

const DownlinkGenerator = {
    // Definitions based on Spec
    DEFS: {
        "0x0": { // DI
            "1": { name: "Start/Stop Counter", type: "select", opts: { 1: "Start", 0: "Stop" }, len: 1, cmdId: 1, desc: "Control the counter operation" },
            "2": { name: "Get/Clear Overflow", type: "fixed", val: 0, len: 1, cmdId: 2, desc: "Clear Overflow Status (No params)" },
            "3": { name: "Clear Counter", type: "fixed", val: 1, len: 1, cmdId: 3, desc: "Reset Counter Value to 0" },
            "4": { name: "Clear L2H Latch", type: "fixed", val: 0, len: 1, cmdId: 4, desc: "Clear Latch Status" },
            "5": { name: "Clear H2L Latch", type: "fixed", val: 0, len: 1, cmdId: 5, desc: "Clear Latch Status" },
            "6": { name: "Set Conv. Interval", type: "number", unit: "sec", scale: 1, len: 4, cmdId: 6, max: 86400, desc: "Update Interval in seconds (e.g. 60 = 1 min)" }
        },
        "0x1": { // DO
            "1": { name: "Set Signal Logic", type: "select", opts: { 1: "High", 0: "Low" }, len: 1, cmdId: 1 },
            "2": { name: "Set Pulse Mode", type: "select", opts: { 1: "Enable", 0: "Disable" }, len: 1, cmdId: 2 },
            "3": { name: "Stop Pulse", type: "fixed", val: 1, len: 1, cmdId: 3 }
        },
        "0x3": { // AI
            "1": { name: "Clear High Alarm", type: "fixed", val: 0, len: 1, cmdId: 1 },
            "2": { name: "Clear Low Alarm", type: "fixed", val: 0, len: 1, cmdId: 2 },
            "3": { name: "Clear Max Value", type: "fixed", val: 1, len: 1, cmdId: 3 },
            "4": { name: "Clear Min Value", type: "fixed", val: 1, len: 1, cmdId: 4 },
            "5": { name: "Set Conv. Interval", type: "number", unit: "sec", scale: 1, len: 4, cmdId: 5 }
        },
        "0x5_0": { // Sensor (Temp/Hum)
            "1": { name: "Clear High Alarm", type: "fixed", val: 0, len: 1, cmdId: 1 },
            "2": { name: "Clear Low Alarm", type: "fixed", val: 0, len: 1, cmdId: 2 },
            "3": { name: "Clear Max Val", type: "fixed", val: 1, len: 1, cmdId: 3 },
            "4": { name: "Clear Min Val", type: "fixed", val: 1, len: 1, cmdId: 4 },
            "5": { name: "Set High Alarm", type: "float", scale: 1000, len: 4, desc: "Value * 1000", cmdId: 5, max: 2147483.647 },
            "6": { name: "Set Low Alarm", type: "float", scale: 1000, len: 4, desc: "Value * 1000", cmdId: 6, max: 2147483.647 },
            "7": { name: "Set Offset", type: "float", scale: 1000, len: 4, desc: "Value * 1000", cmdId: 7, max: 2147483.647 }
        },
        "0x5_4": { // Sensor (Accel)
            "1": { name: "Clear Vel. RMS Alarm", type: "fixed", val: 0, len: 1, cmdId: 1 },
            "5": { name: "Set Vel. RMS Limit", type: "float", scale: 100, len: 4, desc: "Value * 100 (Unit: 0.01 mm/s)", cmdId: 5, max: 42949672.95 },
            "9": { name: "Get Log (Msve Data)", type: "number", len: 4, desc: "Log Index (0xFFFFFFFF = Latest)", cmdId: 9 },
            "10": { name: "Read Log Part", type: "composite", parts: [{ id: "idx", type: "number", len: 4, label: "Idx" }, { id: "n", type: "number", len: 2, label: "N (Bytes)" }, { id: "k", type: "number", len: 2, label: "K" }], cmdId: 10 },
            "11": { name: "Get Log (UTC)", type: "composite", parts: [{ id: "idx", type: "number", len: 4, label: "Idx" }, { id: "utc", type: "datetime", len: 4, label: "UTC" }], cmdId: 11 },
            "12": { name: "Enable Features", type: "bitmask", len: 2, options: [{ b: 4, l: "Displacement" }, { b: 3, l: "Standard Deviation" }, { b: 2, l: "Skewness" }, { b: 1, l: "Crest Factor" }, { b: 0, l: "Kurtosis" }], desc: "Enable specific features (Bit 4-0)", cmdId: 12, max: 65535 },
            "14": { name: "Trigger Spec Cmd", type: "fixed", val: 0, len: 0, cmdId: 14 },
            "15": { name: "Get Feature Data", type: "composite", parts: [{ id: "idx", type: "number", len: 4, label: "Idx" }, { id: "tmp", type: "number", len: 1, label: "Send Temp (1=Yes)" }], cmdId: 15 }
        },
        "0x6": { // Device
            "1_1": { name: "Adjust RTC (UTC)", type: "datetime", len: 4, subType: 1, cmdId: 1, desc: "Config Type 1" },
            "1_2": { name: "Adjust RTC (ISO)", type: "string", len: 20, desc: "YYYY-MM-DDThh:mm:ssZ", subType: 1, cmdId: 2 },
            "1_3": { name: "Restart System", type: "fixed_hex", hex: "525354", len: 3, subType: 1, cmdId: 3, desc: "String 'RST'" },
            "1_4": { name: "Adjust RTC Offset", type: "number", unit: "sec", len: 4, subType: 1, cmdId: 4, desc: "Signed Int (+/- Seconds)", max: 2147483647 },
            "1_5": { name: "Query FW Ver", type: "fixed", val: 0, len: 1, subType: 1, cmdId: 5 },

            "2_1": { name: "Update Interval", type: "number", unit: "sec", len: 4, subType: 2, cmdId: 1, desc: "Config Type 2 (1~2592000)", max: 2592000 },
            "2_2": { name: "Schedule", type: "schedule", len: 10, subType: 2, cmdId: 2 },

            "3_1": { name: "Set Class", type: "select", opts: { 1: "Class A", 3: "Class C" }, len: 1, subType: 3, cmdId: 1, desc: "Config Type 3" },
            "3_2": { name: "Message ACK", type: "select", opts: { 1: "Enable", 0: "Disable" }, len: 1, subType: 3, cmdId: 2 },
            "3_3": { name: "Retry Counts", type: "number", len: 1, subType: 3, cmdId: 3, max: 255 }
        },
        "0x8": { // Register
            "1": { name: "Set Register Value", type: "number", len: 2, desc: "Value (0~65535)", cmdId: 1, max: 65535 },
            "128": { name: "Config Scan Interval", type: "composite", parts: [{ id: "mask", type: "number", len: 4, label: "Rule Mask (4 Bytes)" }, { id: "int", type: "number", len: 4, label: "Interval (sec)" }], cmdId: 0x80 }
        },
        "0x7": { // Coil
            "1": { name: "Write Coil", type: "select", opts: { 1: "ON", 0: "OFF" }, len: 1, cmdId: 1 },
            "128": { name: "Config Scan Interval", type: "composite", parts: [{ id: "mask", type: "number", len: 4, label: "Rule Mask (4 Bytes)" }, { id: "int", type: "number", len: 4, label: "Interval (sec)" }], cmdId: 0x80 }
        }
    },

    /**
     * Generate Hex String
     * @param {Object} params - { type, cmdKey, ch, range, port, ch485, seq, data: {} }
     */
    generate: function (params) {
        let typeStr = params.type; // "0x5", "0x6" etc
        let cmdKey = params.cmdKey; // "1", "1_1"
        let conf = this.DEFS[typeStr][cmdKey];
        if (!conf) throw "Invalid Command Configuration";

        let cmdId = conf.cmdId;
        let pData = [];

        // --- Build Data Buffer ---
        if (conf.type === 'schedule') {
            // Mode(1), Weekday(1), StartTime(2), EndTime(2), Interval(4)
            // Using logic from reference but checking spec
            // Spec: Mode(1), Weekday(1), StartTime(2), EndTime(2), Interval(4)
            let mode = parseInt(params.data.schMode || 0);
            let mask = parseInt(params.data.schMask || 0);
            let sH = parseInt(params.data.schStartH), sM = parseInt(params.data.schStartM);
            let eH = parseInt(params.data.schEndH), eM = parseInt(params.data.schEndM);
            let interval = parseInt(params.data.schInt);

            pData.push(mode);
            pData.push(mask);
            pData.push(sH, sM);
            pData.push(eH, eM);

            let b = new Uint32Array([interval]);
            let u = new Uint8Array(b.buffer);
            pData.push(u[0], u[1], u[2], u[3]); // Little Endian
        }
        else if (conf.type === 'bitmask') {
            let mask = parseInt(params.data.bitmask || 0);
            let arr = (conf.len === 2) ? new Uint16Array([mask]) : new Uint8Array([mask]);
            let buf = new Uint8Array(arr.buffer);
            for (let i = 0; i < conf.len; i++) pData.push(buf[i]);
        }
        else if (conf.type === 'composite') {
            conf.parts.forEach(p => {
                let val = params.data[p.id];
                if (p.type === 'datetime') {
                    // val should be unix timestamp
                }
                let arr;
                if (p.len === 1) arr = new Uint8Array([val]);
                else if (p.len === 2) arr = new Uint8Array(new Uint16Array([val]).buffer);
                else if (p.len === 4) arr = new Uint8Array(new Uint32Array([val]).buffer);

                for (let i = 0; i < p.len; i++) pData.push(arr[i]);
            });
        }
        else if (conf.type === 'fixed') {
            // No data or fixed value handled by cmdId mainly, but spec says "Write 0" means 1 byte 0?
            // Looking at Spec: "Clear High Alarm": Write 0. Len 1.
            // So we need to push the value.
            if (conf.len > 0) {
                let val = conf.val;
                pData.push(val);
            }
        }
        else if (conf.type === 'fixed_hex') {
            let matches = conf.hex.match(/.{1,2}/g);
            if (matches) matches.forEach(b => pData.push(parseInt(b, 16)));
        }
        else if (conf.type === 'string') {
            let str = params.data.val || "";
            for (let i = 0; i < str.length; i++) pData.push(str.charCodeAt(i));
        }
        else {
            // number, float, datetime, select
            let val = params.data.val;
            let arr;
            if (conf.len === 1) arr = new Uint8Array([val]);
            else if (conf.len === 2) arr = new Uint8Array(new Int16Array([val]).buffer);
            else if (conf.len === 4) arr = new Uint8Array(new Int32Array([val]).buffer);
            for (let i = 0; i < conf.len; i++) pData.push(arr[i]);
        }

        // --- Build Header & Payload ---
        let payload = [];
        let typeVal = parseInt(params.type.split('_')[0]); // "0x5_0" -> 0x5
        let vizInfo = {};

        // 1. RS-485
        if (typeVal === 0x7 || typeVal === 0x8) {
            let byte1 = (typeVal & 0xF) << 4;
            let port = parseInt(params.port);
            let chL = parseInt(params.ch485);
            let byteCh = (port << 7) | (chL & 0x7F);
            let segLen = 1 + pData.length;

            payload = [byte1, byteCh, segLen, cmdId, ...pData];
            vizInfo = { byte1: byte1, byteCh: byteCh, segLen: segLen };
        }
        // 2. Sensor
        else if (typeVal === 0x5) {
            let range = parseInt(params.range);
            let byte1 = ((typeVal & 0xF) << 4) | (range & 0xF);
            let mask = 0;
            if (range === 4) { // Accel
                // User Feedback: Allow selecting Axes.
                // Spec Update: Bit 7=Z, Bit 6=Y, Bit 5=X
                mask = 0;
                if (params.data.axisZ) mask |= 0x80;
                if (params.data.axisY) mask |= 0x40;
                if (params.data.axisX) mask |= 0x20;
            } else {
                // Temp: Channel Mask
                // Spec: "Header: 0x5 ... Byte 2: CH Index ... Wait.
                // Spec line 211: "Header: 0x3 + CH Index".
                // Spec line 221: "Header: 0x5 + Range". 
                // Wait, for Temp (Range 0), does it have Byte 2?
                // Spec line 225 "Range 0: Temperature / Humidity". No Byte 2 mentioned explicitly in header description?
                // Check Uplink logic...
                // Check reference code for 0x5 Temp:
                // "else { let ch=parseInt(document.getElementById('genCh').value); mask=(ch&7)<<5; }"
                // (ch&7)<<5 means bits 7-5.
                // So it seems matching.
                let ch = parseInt(params.ch) || 0;
                // mask = (ch & 0x7) << 5; // Old logic
                mask = 0; // User Request: Fixed to 0
            }
            let segLen = 1 + pData.length;
            payload = [byte1, mask, segLen, cmdId, ...pData];
            vizInfo = { byte1: byte1, mask: mask, segLen: segLen };
        }
        // 3. Standard (0x0, 0x1, 0x3, 0x6)
        else {
            let low = 0;
            if (typeVal === 0x6) {
                low = conf.subType;
            } else {
                // 0x0, 0x1, 0x3: HC Index (0-15)
                low = parseInt(params.ch) & 0xF;
            }

            let byte1 = ((typeVal & 0xF) << 4) | (low & 0xF);
            let segLen = 1 + pData.length;
            payload = [byte1, segLen, cmdId, ...pData];
            vizInfo = { byte1: byte1, segLen: segLen };
        }

        // --- Checksum ---
        // Algo: CRC-8-CCITT (Poly 0x07, Init 0xFF).
        // Spec says: "WCRC ... 計算範圍: 僅針對 WPayload (不包含 WHDR)".
        // Wait. "WPayload" in LoRaWAN usually means the Application Payload.
        // "WHDR" is Byte 0 of the LoRaWAN frame?
        // Spec Line 9: "LoRaWAN Frame Structure: WHDR (1 Byte) + WPayload (N Bytes) + WCRC".
        // BUT the Downlink Generator in Ref code calculates CRC over the *entire* generated sequence (except the LoRaWAN header 0x80?).
        // Use Ref Code logic:
        // `let head=[0x80,seq,payload.length];`
        // `let full=[...head, ...payload, crc];` (Wait, CRC at end).
        // Ref Line 566: `let crc=0xFF; for(let b of payload){...}`
        // It calculates CRC over `payload`.
        // `payload` in Ref code includes the Command Header (Byte 1, etc).
        // Let's trace Ref Code `payload`.
        // `payload=[byte1, segLen, cmdId, ...data];`
        // `byte1` is the IO Type/Channel byte.
        // So `payload` corresponds to `WPayload`.
        // The `head` (0x80...) is the `WHDR` (Advantech Prop Header?).
        // Spec Line 20: "WHDR Header ... Byte 0".
        // So the "Header" (Byte 0) is 0x80 (Start=1, Ver=0, Addr=0).
        // And CRC covers WPayload.
        // So I should calculate CRC over `payload`.

        let crc = 0xFF;
        for (let b of payload) {
            crc ^= b;
            for (let k = 0; k < 8; k++) {
                crc = (crc & 0x80) ? ((crc << 1) ^ 0x07) : (crc << 1);
            }
            crc &= 0xFF;
        }

        // --- Final Assembly ---
        // --- Final Assembly ---
        // Header: 0x80 (First Seg), Sequence (params.seq), Total Len (payload.length)
        let seq = parseInt(params.seq) || 0;
        let head = [0x80, seq, payload.length];
        let full = [...head, ...payload, crc];

        // Format Helper
        const toHex = (arr) => arr.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');

        // Return structured object if valid, else plain hex string (backward compat if needed, but we'll change usage)
        return {
            hex: toHex(full),
            parts: {
                header: toHex(head),
                // Viz breakdown
                whdr: toHex([0x80]),
                seq: toHex([seq]),
                len: toHex([payload.length]),
                typeRange: vizInfo.byte1 ? toHex([vizInfo.byte1]) : "",
                mask: vizInfo.mask !== undefined ? toHex([vizInfo.mask]) : "",
                segLen: vizInfo.segLen !== undefined ? toHex([vizInfo.segLen]) : "",
                cmdId: toHex([cmdId]),
                data: toHex(pData),
                crc: toHex([crc])
            }
        };
    }
};
