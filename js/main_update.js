
// --- MAC Analysis Logic ---

function toggleMacMode() {
    let mode = document.querySelector('input[name="macMode"]:checked').id;
    let isGen = (mode === 'macModeGen');

    document.getElementById('mac-gen-view').style.display = isGen ? 'block' : 'none';
    document.getElementById('mac-dec-view').style.display = isGen ? 'none' : 'block';

    document.getElementById('mac-gen-output-area').style.display = isGen ? 'block' : 'none';
    document.getElementById('mac-dec-output-area').style.display = isGen ? 'none' : 'block';
}

function updateMacCommands() {
    let dir = document.getElementById('macGenDir').value; // 'up' or 'down'
    let isUplink = (dir === 'up');
    let select = document.getElementById('macGenCmd');
    select.innerHTML = '';

    Object.keys(MacCmd.DEFS).forEach(cid => {
        let def = MacCmd.DEFS[cid];
        // Filter based on direction? 
        // Uplink: LinkCheck(02), LinkADRAns(03), DutyCycleAns(04), etc.
        // Downlink: LinkCheckAns(02), LinkADRReq(03), etc.

        // We need to know if this command exists in this direction
        // My Logic:
        // LinkCheck(02): Up(Req), Down(Ans) -> Both
        // LinkADR(03): Up(Ans), Down(Req) -> Both
        // ... ALL commands exist in both directions (Req/Ans pair) except maybe proprietary.
        // So we show ALL, but the name might imply context?
        // Let's just show "CID - Name"

        let opt = document.createElement('option');
        opt.value = cid;
        opt.innerText = `${cid} - ${def.name}`;
        select.appendChild(opt);
    });

    updateMacParams();
}

function updateMacParams() {
    let cid = document.getElementById('macGenCmd').value;
    let dir = document.getElementById('macGenDir').value;
    let isUplink = (dir === 'up');
    let container = document.getElementById('macGenParamArea');
    container.innerHTML = '';

    // Generate inputs based on command and direction
    // This requires a mapping of what params are needed for each Req/Ans.
    // I didn't define "params schema" in DEFS, only logic in generate().
    // I need to hardcode the input fields here based on CID+Dir.

    let html = '';

    if (isUplink) {
        // --- UPLINK (ANSTERS) ---
        if (cid === '0x02') { // LinkCheckAns -> Error: LinkCheckReq(Up) has NO payload.
            // Wait, LinkCheck(02) Uplink is REQ (0 bytes).
            html = '<div class="text-secondary small">No parameters for LinkCheckReq (Uplink).</div>';
        }
        else if (cid === '0x03' || cid === '0x05' || cid === '0x07' || cid === '0x0A') { // Status
            html += createCheck('ack1', 'Power ACK');
            html += createCheck('ack2', 'Data Rate ACK');
            html += createCheck('ack3', 'Channel Mask/Freq ACK');
        }
        else if (cid === '0x06') { // DevStatusAns
            html += createNumInput('battery', 'Battery (0=Ext, 255=Unk)', 0, 255, 255);
            html += createNumInput('margin', 'SNR Margin (-32..31)', -32, 31, 0);
        }
        else if (cid === '0x0D') { // DeviceTimeReq
            html = '<div class="text-secondary small">No parameters for DeviceTimeReq (Uplink).</div>';
        }
    } else {
        // --- DOWNLINK (REQUESTS) ---
        if (cid === '0x02') { // LinkCheckAns
            html += createNumInput('margin', 'Margin (dB)', 0, 255, 10);
            html += createNumInput('gwCnt', 'Gateway Count', 0, 255, 1);
        }
        else if (cid === '0x03') { // LinkADRReq
            html += createNumInput('dr', 'Data Rate (0-15)', 0, 15, 0);
            html += createNumInput('txPower', 'TX Power (0-15)', 0, 15, 0);
            html += createNumInput('chMask', 'Channel Mask (16-bit Hex)', 0, 65535, 0, true); // Hex preferred
            html += createNumInput('chMaskCntl', 'ChMaskCntl (0-7)', 0, 7, 0);
            html += createNumInput('nbTrans', 'NbTrans (0-15)', 0, 15, 1);
        }
        else if (cid === '0x04') { // DutyCycleReq
            html += createNumInput('maxDC', 'MaxDC (0-15)', 0, 15, 0);
        }
        else if (cid === '0x05') { // RXParamSetupReq
            html += createNumInput('rx1DrOff', 'RX1 DR Offset (0-7)', 0, 7, 0);
            html += createNumInput('rx2DataRate', 'RX2 Data Rate (0-15)', 0, 15, 0);
            html += createNumInput('freq', 'Frequency (Hz/100)', 0, 16777215, 8681000);
        }
        else if (cid === '0x0D') { // DeviceTimeAns
            html += createNumInput('seconds', 'GPS Seconds', 0, 4294967295, 0);
            html += createNumInput('frac', 'Fraction (1/256)', 0, 255, 0);
        }
        // ... Add others as needed (NewChannel, etc) ...
        // For brevity implementing common ones first.
    }

    container.innerHTML = html;
}

function createNumInput(id, label, min, max, def, isHex = false) {
    return `<div class="mb-2">
        <label class="form-label small">${label}</label>
        <input type="${isHex ? 'text' : 'number'}" class="form-control form-control-sm" id="mac_${id}" value="${def}" 
        ${isHex ? 'placeholder="0xFFFF"' : `min="${min}" max="${max}"`}>
    </div>`;
}

function createCheck(id, label) {
    return `<div class="form-check">
        <input class="form-check-input" type="checkbox" id="mac_${id}">
        <label class="form-check-label small" for="mac_${id}">${label}</label>
    </div>`;
}


function runMacGenerator() {
    let cid = document.getElementById('macGenCmd').value;
    let dir = document.getElementById('macGenDir').value;
    let isUplink = (dir === 'up');

    let params = {};
    // Extract logical params relative to current view
    let inputs = document.getElementById('macGenParamArea').querySelectorAll('input');
    inputs.forEach(input => {
        let key = input.id.replace('mac_', '');
        if (input.type === 'checkbox') params[key] = input.checked;
        else {
            if (input.type === 'text') params[key] = parseInt(input.value, 16);
            else params[key] = parseInt(input.value);
        }
    });

    let hex = MacCmd.generate(cid, isUplink, params);
    if (hex.error) {
        document.getElementById('macGenOutput').innerText = "Error: " + hex.error;
    } else {
        document.getElementById('macGenOutput').innerText = hex;
    }
}

function runMacDecoder() {
    let hex = document.getElementById('macDecInput').value;
    let dir = document.getElementById('macDecDir').value;
    let isUplink = (dir === 'up');

    let res = MacCmd.decode(hex, isUplink);

    let html = '';
    if (res.error) {
        html += `<div class="alert alert-danger p-2 mb-2"><i class="fa-solid fa-triangle-exclamation"></i> ${res.error}</div>`;
    }

    if (res.commands.length === 0 && !res.error) {
        html += `<div class="text-secondary">No commands found.</div>`;
    }

    res.commands.forEach(cmd => {
        html += `<div class="mb-3 border-bottom border-secondary pb-2">
            <div class="d-flex justify-content-between">
                <strong>${cmd.name}</strong>
                <span class="badge bg-secondary">${cmd.cid}</span>
            </div>
            <div class="small font-monospace text-muted mt-1">Raw: ${MacCmd.toHex(0, 0)} ${cmd.raw.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}</div>
            <div class="mt-2">`;

        if (Object.keys(cmd.params).length > 0) {
            html += `<table class="table table-dark table-sm table-borderless small mb-0">`;
            for (let k in cmd.params) {
                html += `<tr><td class="text-secondary w-50">${k}</td><td class="font-monospace text-light">${cmd.params[k]}</td></tr>`;
            }
            html += `</table>`;
        } else {
            html += `<span class="text-secondary small">Empty Payload</span>`;
        }
        html += `</div></div>`;
    });

    document.getElementById('macDecResult').innerHTML = html;
}

function clearMacDecoder() {
    document.getElementById('macDecInput').value = '';
    document.getElementById('macDecResult').innerHTML = '<pre class="mb-0 border-0 bg-transparent p-0 text-light font-monospace">Enter Hex and click Decode...</pre>';
}
