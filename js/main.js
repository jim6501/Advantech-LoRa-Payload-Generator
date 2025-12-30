
// --- Uplink UI Logic ---
function runParser() {
    let hex = document.getElementById('upHexInput').value.trim();
    if (!hex) return;

    // Call the wrapper from parser.js
    let result = parseHexString(hex);

    // Display result
    let output = document.getElementById('upOutput');
    if (result.error) {
        output.innerHTML = `<span style="color: #ff7b72;">${result.error}</span>`;
    } else {
        output.innerHTML = syntaxHighlight(result.data.payload || result);
    }
}

function loadUpExample() {
    document.getElementById('upHexInput').value = "811C405008070000000C3200005429E2170000E4011F01CB0046050000CC015A01F500CB0400006601970120016F01030000000073992E6860091B0002940D74992E6877";
    runParser();
}

function syntaxHighlight(json) {
    if (typeof json != 'string') json = JSON.stringify(json, undefined, 2);
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
        var cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) cls = 'json-key';
            else cls = 'json-string';
        }
        return `<span class="${cls}">${match}</span>`;
    });
}

// --- Downlink UI Logic ---
function updateGenCommands() {
    let type = document.getElementById('genType').value;
    let rangeGroup = document.getElementById('sensorRangeGroup');
    let chGroup = document.getElementById('channelGroup');
    let axisGroup = document.getElementById('axisGroup');
    let portGroup = document.getElementById('portGroup');
    let chInput = document.getElementById('genCh');
    let chHint = document.getElementById('chHint');
    let sel = document.getElementById('genCmd');

    sel.innerHTML = "";
    rangeGroup.style.display = 'none';
    axisGroup.style.display = 'none';
    portGroup.style.display = 'none';

    // Reset Channel State
    chGroup.style.display = 'block';
    chInput.disabled = false;
    chHint.innerText = "";

    // Determine Real Type Key for DEFS
    let realType = type;

    if (type === "0x5") {
        rangeGroup.style.display = 'block';
        let range = document.getElementById('sensorRange').value;
        realType = (range === "0") ? "0x5_0" : "0x5_4";

        if (realType === "0x5_4") {
            chGroup.style.display = 'none';
            axisGroup.style.display = 'block';
        } else {
            chHint.innerText = "Target Channel (Generates Mask Byte)";
        }
    } else if (type === "0x6") {
        chGroup.style.display = 'none';
        chInput.value = "0";
    } else if (type === "0x7" || type === "0x8") {
        chGroup.style.display = 'none';
        portGroup.style.display = 'flex';
    }

    // Populate Commands
    let defs = DownlinkGenerator.DEFS[realType];
    if (defs) {
        for (let k in defs) {
            let opt = document.createElement("option");
            opt.value = k;
            opt.text = defs[k].name;
            sel.appendChild(opt);
        }
    }
    sel.setAttribute('data-real-type', realType);
    sel.setAttribute('data-real-type', realType);
    updateGenParams();

    // 5. Handle Fixed Sensor Inputs (User Request)
    // "Sensor data (I/O Type: 0x5) 的 CH Index/Axis Mask 固定都是0" -> Disable inputs.
    let isSensor = realType.startsWith('0x5');
    if (chInput) {
        chInput.disabled = isSensor;
        if (isSensor) chInput.value = 0;
    }

    // Axes for Accel (0x5_4 Only)
    let axes = ['axisX', 'axisY', 'axisZ'];
    if (realType === '0x5_4') {
        axes.forEach(id => {
            let el = document.getElementById(id);
            if (el) {
                el.disabled = false; // Enabled per user feedback
                // Don't auto-uncheck, keep user state or default
            }
        });
    } else {
        // Re-enable if switching away? Or just default logic handles visibility?
        let axes = ['axisX', 'axisY', 'axisZ'];
        axes.forEach(id => {
            let el = document.getElementById(id);
            if (el) {
                el.disabled = false;
            }
        });
    }
}

function updateGenParams() {
    let type = document.getElementById('genCmd').getAttribute('data-real-type');
    let cmdKey = document.getElementById('genCmd').value;
    let div = document.getElementById('genParamArea');
    div.innerHTML = "";

    if (!type || !cmdKey) return;

    let conf = DownlinkGenerator.DEFS[type][cmdKey];
    if (!conf) return;

    if (conf.type === 'bitmask') {
        div.innerHTML = `<label class="text-secondary small mb-2">${conf.desc}</label><div class="grid-selector">` +
            conf.options.map(o => `
                <input type="checkbox" id="bm_${o.b}" class="feature-check" value="${o.b}" name="bitmask_opt">
                <label for="bm_${o.b}" class="feature-label"><i class="fa-solid fa-check me-2"></i>${o.l}</label>
            `).join('') + `</div>`;
        return;
    }

    if (conf.type === 'schedule') {
        div.innerHTML = `<div class="mb-2"><select id="schMode" class="form-select"><option value="0">Basic</option><option value="1">Advance</option></select></div>
        <div class="mb-2"><div class="weekday-selector">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => `<input type="checkbox" id="d${i}" class="weekday-check"><label for="d${i}" class="weekday-label">${d}</label>`).join('')}</div></div>
        <div class="row g-2 mb-2"><div class="col-6"><input type="time" id="schStart" class="form-control" value="09:00"></div><div class="col-6"><input type="time" id="schEnd" class="form-control" value="18:00"></div></div>
        <div class="mb-2"><input type="number" id="schInt" class="form-control" placeholder="Interval (sec)" value="600"></div>`;
        return;
    }

    if (conf.type === 'composite') {
        let html = `<label class="text-accent mb-2 small">Parameters:</label>`;
        conf.parts.forEach(p => {
            html += `<div class="mb-2"><label class="text-secondary small">${p.label}</label>`;
            if (p.type === 'datetime') html += `<input type="datetime-local" id="comp_${p.id}" class="form-control form-control-sm">`;
            else {
                html += `<input type="text" id="comp_${p.id}" class="form-control" placeholder="Val">`;
            }
            html += `</div>`;
        });
        div.innerHTML = html;
        initDates();
        // Add event listeners for validation (basic)
        div.querySelectorAll('input').forEach(el => {
            el.addEventListener('input', () => validateInput(el));
        });
        return;
    }

    let html = `<label class="text-secondary mb-1">${conf.name}</label>`;
    if (conf.type === 'fixed_hex') html += `<input class="form-control" disabled value="${conf.hex}">`;
    else if (conf.type === 'fixed') html += `<input class="form-control" disabled value="Empty Payload">`;
    else if (conf.type === 'select') {
        html += `<select id="genVal" class="form-select">`;
        for (let k in conf.opts) html += `<option value="${k}">${conf.opts[k]}</option>`;
        html += `</select>`;
    } else if (conf.type === 'string') {
        html += `<input type="text" class="form-control" id="genVal" placeholder="${conf.desc || ''}">`;
    } else if (conf.type === 'float') {
        html += `<div class="div-group">
            <div class="input-group">
                <input type="number" step="0.01" class="form-control" id="genVal" placeholder="Value" data-max="${conf.max || ''}">
                <span class="input-group-text">x${conf.scale}</span>
            </div>
            <div class="form-text text-danger d-none" id="valWarning">Value exceeds limit!</div>
        </div>`;
    } else if (conf.type === 'number') {
        let ph = conf.desc ? `e.g. ${conf.desc.split('e.g. ')[1] || 'Value'}` : 'Value';
        html += `<div class="div-group">
            <div class="input-group">
                <select class="input-group-text fmt-select" id="fmt_genVal" onchange="validateInput(document.getElementById('genVal'))">
                    <option value="dec">DEC</option>
                    <option value="hex">HEX</option>
                </select>
                <input type="text" class="form-control" id="genVal" placeholder="${ph}" data-max="${conf.max || ''}">
                ${conf.unit ? `<span class="input-group-text">${conf.unit}</span>` : ''}
            </div>
            <div class="form-text text-danger d-none" id="valWarning">Value exceeds limit!</div>
        </div>`;
    } else if (conf.type === 'datetime') {
        html += `<input type="datetime-local" class="form-control" id="genVal">`;
    }

    if (conf.desc) html += `<div class="text-muted small mt-2"><i class="fa-solid fa-circle-info me-1"></i>${conf.desc}</div>`;
    div.innerHTML = html;
    if (conf.type === 'datetime') initDates();

    // Add validation listener for main input
    let mainInput = document.getElementById('genVal');
    if (mainInput && (conf.type === 'number' || conf.type === 'float')) {
        mainInput.addEventListener('input', () => validateInput(mainInput));
    }
}

function validateInput(el) {
    let max = parseFloat(el.getAttribute('data-max'));
    if (isNaN(max)) return;

    let valStr = el.value.trim();
    if (!valStr) {
        setWarning(el, false);
        return;
    }

    let val = 0;
    // Check format if exists
    let grp = el.closest('.div-group'); // Using div-group as container now
    let fmtSel = grp ? grp.querySelector('.fmt-select') : null;
    let isHex = fmtSel && fmtSel.value === 'hex';

    if (isHex) {
        // Strip 0x if present
        valStr = valStr.replace(/^0x/i, '');
        // Validate hex string
        if (/[^0-9A-Fa-f]/.test(valStr)) {
            // Invalid Hex
            // Can imply warning or just ignore. 
        }
        val = parseInt(valStr, 16);
    } else {
        val = parseFloat(valStr);
    }

    if (val > max) {
        setWarning(el, true, `Max: ${markedMax(max, isHex)}`);
    } else {
        setWarning(el, false);
    }
}

function markedMax(max, isHex) {
    if (isHex) return "0x" + max.toString(16).toUpperCase();
    return max;
}

function setWarning(el, show, msg) {
    let parent = el.closest('.div-group') || el.parentElement.parentElement;
    let warn = parent.querySelector('#valWarning');
    if (!warn) return;

    if (show) {
        warn.classList.remove('d-none');
        warn.innerText = msg || "Value exceeds limit!";
    } else {
        warn.classList.add('d-none');
    }
}

function parseInputVal(el) {
    if (!el) return 0;
    let valStr = el.value.trim();
    let grp = el.closest('.div-group');
    let fmtSel = grp ? grp.querySelector('.fmt-select') : null;

    if (fmtSel && fmtSel.value === 'hex') {
        return parseInt(valStr.replace(/^0x/i, ''), 16);
    }
    return parseFloat(valStr);
}

function runGenerator() {
    try {
        let type = document.getElementById('genType').value;
        let realType = document.getElementById('genCmd').getAttribute('data-real-type');
        let cmdKey = document.getElementById('genCmd').value;
        let conf = DownlinkGenerator.DEFS[realType][cmdKey];

        // Gather Params
        let params = {
            type: realType,
            cmdKey: cmdKey,
            ch: document.getElementById('genCh').value,
            range: document.getElementById('sensorRange').value,
            port: document.getElementById('genPort').value,
            ch485: document.getElementById('genCh485').value,
            seq: document.getElementById('genSeq').value,
            data: {}
        };

        // Specific Data Gathering
        if (conf.type === 'schedule') {
            params.data.schMode = document.getElementById('schMode').value;
            let mask = 0;
            for (let i = 0; i < 7; i++) if (document.getElementById('d' + i).checked) mask |= (1 << i);
            params.data.schMask = mask;
            let s = document.getElementById('schStart').value.split(':');
            let e = document.getElementById('schEnd').value.split(':');
            params.data.schStartH = s[0]; params.data.schStartM = s[1];
            params.data.schEndH = e[0]; params.data.schEndM = e[1];
            params.data.schInt = document.getElementById('schInt').value;
        }
        else if (conf.type === 'bitmask') {
            let mask = 0;
            conf.options.forEach(o => {
                let el = document.getElementById('bm_' + o.b);
                if (el && el.checked) mask |= (1 << o.b);
            });
            params.data.bitmask = mask;
        }
        else if (conf.type === 'composite') {
            conf.parts.forEach(p => {
                let el = document.getElementById('comp_' + p.id);
                let val = el.value;
                if (p.type === 'datetime') val = Math.floor(new Date(val).getTime() / 1000);

                params.data[p.id] = val;
            });
        }
        else if (conf.type !== 'fixed' && conf.type !== 'fixed_hex') {
            let el = document.getElementById('genVal');
            let val = el.value;

            if (conf.type === 'datetime') params.data.val = Math.floor(new Date(val).getTime() / 1000);
            else if (conf.type === 'float') params.data.val = Math.round(parseFloat(val) * conf.scale);
            else {
                // Number with Hex support
                params.data.val = parseInputVal(el);
            }
        }

        // Accel Axis
        if (realType === '0x5_4') {
            params.data.axisX = document.getElementById('axisX').checked;
            params.data.axisY = document.getElementById('axisY').checked;
            params.data.axisZ = document.getElementById('axisZ').checked;
        }

        let result = DownlinkGenerator.generate(params);
        // Handle new structured return
        let hex = result.hex || result;

        document.getElementById('genOutput').innerText = hex;
        document.getElementById('genBreakdown').innerText = hex.match(/.{1,2}/g).join(' ');

        if (result.parts) {
            let p = result.parts;
            let html = ``;
            // "Header: 80 0 8" (Merged WHDR, Seq, Len)
            let h1 = p.whdr;
            let h2 = parseInt(p.seq, 16).toString(16).toUpperCase();
            let h3 = parseInt(p.len, 16).toString(16).toUpperCase();
            html += `<span class="struct-badge sb-header" title="Header (WHDR Seq Len)">Header: ${h1} ${h2} ${h3}</span>`;

            // Type|Rng: 0x50
            if (p.typeRange) {
                let v = parseInt(p.typeRange, 16).toString(16).toUpperCase();
                html += `<span class="struct-badge sb-type" title="Type | Range">Type|Rng: 0x${v}</span>`;
            }

            // Mask: 0x0
            if (p.mask) {
                let v = parseInt(p.mask, 16).toString(16).toUpperCase();
                html += `<span class="struct-badge sb-mask" title="Mask/Ch">Mask: 0x${v}</span>`;
            }

            // Len: 5 (Segment Len)
            if (p.segLen) {
                let v = parseInt(p.segLen, 16).toString(16).toUpperCase();
                html += `<span class="struct-badge sb-len" title="Seg Len">Len: ${v}</span>`;
            }

            // Cmd: 5
            if (p.cmdId) {
                let v = parseInt(p.cmdId, 16).toString(16).toUpperCase();
                html += `<span class="struct-badge sb-cmd" title="Cmd ID">Cmd: ${v}</span>`;
            }

            // Data [length]
            if (p.data && p.data.length > 0) {
                let byteCount = p.data.length / 2;
                html += `<span class="struct-badge sb-data" title="Payload Data">Data [${byteCount}]</span>`;
            }

            // CRC: cc
            if (p.crc) {
                html += `<span class="struct-badge sb-crc" title="CRC">CRC: ${p.crc}</span>`;
            }

            document.getElementById('genStructure').innerHTML = html;
        } else {
            // Fallback
            document.getElementById('genStructure').innerHTML = `<span class="struct-badge sb-header">Header: 0x80..</span> <span class="struct-badge sb-len">Len: ${hex.length / 2}</span> <span class="struct-badge sb-crc">CRC Valid</span>`;
        }

    } catch (e) {
        document.getElementById('genOutput').innerText = "Error: " + e;
        console.error(e);
    }
}

// Helpers
function switchTab(t) {
    document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
    document.getElementById('nav-' + t).classList.add('active');
    document.getElementById('view-uplink').style.display = t === 'uplink' ? 'block' : 'none';
    document.getElementById('view-downlink').style.display = t === 'downlink' ? 'block' : 'none';
    if (t === 'downlink') updateGenCommands();
}

function copyText(id) {
    navigator.clipboard.writeText(document.getElementById(id).innerText);
}

function initDates() {
    setTimeout(() => {
        document.querySelectorAll('input[type="datetime-local"]').forEach(el => {
            if (!el.value) {
                let now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                el.value = now.toISOString().slice(0, 16);
            }
        })
    }, 0);
}

// Events
document.getElementById('genType').addEventListener('change', updateGenCommands);
document.getElementById('sensorRange').addEventListener('change', updateGenCommands);
document.getElementById('genCmd').addEventListener('change', updateGenParams);
updateGenCommands(); // Init
