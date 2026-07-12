const INTENSITY_PRESETS = {
    1: { threshold: -20, ratio: 4,  attack: 10, release: 200, gain: 2, label: 'Light'   },
    2: { threshold: -30, ratio: 8,  attack: 5,  release: 150, gain: 4, label: 'Medium'  },
    3: { threshold: -40, ratio: 15, attack: 2,  release: 100, gain: 6, label: 'Heavy'   }
};

const EQ_PRESETS = {
    flat:  { bass: 0,  mid: 0,  treble: 0 },
    bass:  { bass: 6,  mid: 0,  treble: 2 },
    voice: { bass: -3, mid: 5,  treble: 3 },
    loud:  { bass: 4,  mid: 0,  treble: 4 }
};

document.addEventListener('DOMContentLoaded', () => {
    const vu = document.getElementById('vu');
    const ctx = vu.getContext('2d');
    vu.width = vu.clientWidth || 278; vu.height = 24;

    const statusDot = document.getElementById('statusDot');
    const reductionBadge = document.getElementById('reductionBadge');

    const gearBtn = document.getElementById('gearBtn');
    const viewSimple = document.getElementById('viewSimple');
    const viewAdv = document.getElementById('viewAdvanced');

    const simpleToggle = document.getElementById('simpleToggle');
    const simpleStateOff = document.getElementById('simpleStateOff');
    const simpleStateOn = document.getElementById('simpleStateOn');
    const intensitySlider = document.getElementById('intensitySlider');
    const intensityVal = document.getElementById('intensityVal');
    const tooltipBox = document.getElementById('tooltipBox');

    const compressBtn = document.getElementById('compressBtn');
    const eqToggle = document.getElementById('eqToggle');
    const eqSection = document.getElementById('eqSection');
    const eqEnableBtn = document.getElementById('eqEnableBtn');
    const presetBtns = document.querySelectorAll('[data-p]');

    let mode = 'simple';
    let isCustomPreset = false;

    chrome.runtime.onMessage.addListener(msg => {
        if (msg.action === 'audioLevel') drawMeter(msg.level, msg.reduction);
    });

    function showMode(m) {
        mode = m;
        viewSimple.classList.toggle('hidden', m !== 'simple');
        viewAdv.classList.toggle('visible', m === 'advanced');
        chrome.runtime.sendMessage({ action: 'setMode', mode: m }).catch(() => {});
    }

    function sendState(payload) {
        chrome.runtime.sendMessage({ action: 'updateState', ...payload }).catch(() => {});
    }

    function applyIntensity(val) {
        const p = INTENSITY_PRESETS[val];
        if (!p) return;
        intensityVal.textContent = p.label;
        simpleToggle.checked ? sendState({
            enabled: true, threshold: p.threshold, ratio: p.ratio,
            attack: p.attack, release: p.release, gain: p.gain,
            bass: 0, mid: 0, treble: 0, eqEnabled: false
        }) : null;
    }

    simpleToggle.addEventListener('change', () => {
        const on = simpleToggle.checked;
        simpleStateOff.style.color = on ? 'var(--text-muted)' : 'var(--text)';
        simpleStateOn.style.color = on ? 'var(--success)' : 'var(--text-muted)';
        tooltipBox.classList.toggle('active', on);
        tooltipBox.textContent = on
            ? '✓ Audio is being leveled automatically'
            : 'Enable audio compression to level loud and quiet parts automatically';
        if (on) {
            const val = parseInt(intensitySlider.value);
            applyIntensity(val);
        } else {
            sendState({ enabled: false });
        }
    });

    intensitySlider.addEventListener('input', () => {
        const val = parseInt(intensitySlider.value);
        if (simpleToggle.checked) applyIntensity(val);
        else intensityVal.textContent = INTENSITY_PRESETS[val].label;
    });

    // Advanced view controls
    compressBtn.addEventListener('click', () => {
        const on = !compressBtn.classList.contains('active');
        compressBtn.textContent = on ? 'Disable Compressor' : 'Enable Compressor';
        compressBtn.classList.toggle('active', on);
        statusDot.classList.toggle('active', on);
        sendState({
            enabled: on,
            threshold: document.getElementById('threshold-sl').value,
            ratio: document.getElementById('ratio-sl').value,
            attack: document.getElementById('attack-sl').value,
            release: document.getElementById('release-sl').value,
            gain: document.getElementById('gain-sl').value
        });
    });

    eqToggle.addEventListener('click', () => {
        const vis = !eqSection.classList.contains('hidden');
        eqSection.classList.toggle('hidden', !vis);
        eqToggle.classList.toggle('on', !vis);
    });

    eqEnableBtn.addEventListener('click', () => {
        const en = !eqEnableBtn.classList.contains('on');
        eqEnableBtn.classList.toggle('on', en);
        eqEnableBtn.textContent = en ? 'ON' : 'OFF';
        sendState({ eqEnabled: en });
    });

    presetBtns.forEach(b => b.addEventListener('click', () => {
        presetBtns.forEach(p => p.classList.remove('active'));
        b.classList.add('active');
        const v = EQ_PRESETS[b.dataset.p];
        if (v) {
            isCustomPreset = false;
            state.bass = v.bass; state.mid = v.mid; state.treble = v.treble;
            syncAdvancedView();
            sendState({ bass: v.bass, mid: v.mid, treble: v.treble });
        }
    }));

    function syncAdvancedView() {
        document.getElementById('eq-bass-val').textContent = formatDB(state.bass);
        document.getElementById('eq-mid-val').textContent = formatDB(state.mid);
        document.getElementById('eq-treble-val').textContent = formatDB(state.treble);
        document.getElementById('eq-bass-sl').value = state.bass;
        document.getElementById('eq-mid-sl').value = state.mid;
        document.getElementById('eq-treble-sl').value = state.treble;
    }

    function formatDB(v) { return `${v > 0 ? '+' : ''}${v} dB`; }

    ['threshold', 'ratio', 'attack', 'release', 'gain'].forEach(key => {
        const sl = document.getElementById(`${key}-sl`);
        const vl = document.getElementById(`${key}-val`);
        if (sl) sl.addEventListener('input', () => {
            const val = parseFloat(sl.value);
            if (key === 'ratio') vl.textContent = `${val}:1`;
            else if (key === 'attack' || key === 'release') vl.textContent = `${val} ms`;
            else if (key === 'gain') vl.textContent = `${val} dB`;
            else vl.textContent = `${val} dB`;
            sendState({ [key]: val });
        });
    });

    ['eq-bass', 'eq-mid', 'eq-treble'].forEach(key => {
        const sl = document.getElementById(`${key}-sl`);
        const vl = document.getElementById(`${key}-val`);
        if (sl) sl.addEventListener('input', () => {
            const val = parseFloat(sl.value);
            vl.textContent = formatDB(val);
            if (!isCustomPreset) {
                isCustomPreset = true;
                presetBtns.forEach(p => p.classList.remove('active'));
            }
            state[key.replace('eq-', '')] = val;
            sendState({ [key.replace('eq-', '')]: val });
        });
    });

    gearBtn.addEventListener('click', () => {
        showMode(mode === 'simple' ? 'advanced' : 'simple');
    });

    // VU meter
    function drawMeter(level, reductionDb) {
        const w = vu.width, h = vu.height;
        let scaled = Math.min(1, (level || 0) * 1.5);
        const decay = 0.08;
        if (scaled > window._vuLv) window._vuLv = scaled;
        else window._vuLv = (window._vuLv || 0) * (1 - decay) + scaled * decay;
        let reduction = 0;
        if (typeof reductionDb === 'number' && reductionDb < 0) reduction = Math.min(1, Math.abs(reductionDb) / 24);
        if (reduction > window._vuRd) window._vuRd = reduction;
        else window._vuRd = (window._vuRd || 0) * (1 - decay) + reduction * decay;
        if (scaled > (window._vuPk || 0)) { window._vuPk = scaled; window._vuPd = 0; }
        else { window._vuPd = (window._vuPd || 0) + 0.02; window._vuPk = Math.max(0, (window._vuPk || 0) - window._vuPd); }
        ctx.clearRect(0, 0, w, h);
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#68d391'); grad.addColorStop(0.5, '#ecc94b'); grad.addColorStop(1, '#f56565');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w * Math.min(1, window._vuLv), h);
        ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w * Math.min(1, window._vuLv), h); ctx.globalAlpha = 1;
        if ((window._vuRd || 0) > 0.01) {
            const rw = w * window._vuRd;
            ctx.fillStyle = 'rgba(245,90,90,0.35)'; ctx.fillRect(Math.max(0, w * Math.min(1, window._vuLv) - rw), 0, rw, h);
        }
        if ((window._vuPk || 0) > 0.01) { ctx.fillStyle = '#fff'; ctx.fillRect(w * window._vuPk - 1, 0, 2, h); }
        if (reductionBadge) reductionBadge.classList.toggle('visible', (window._vuRd || 0) > 0.02);
    }

    let state = { enabled: false };

    function init() {
        chrome.runtime.sendMessage({ action: 'getState' }, (bg) => {
            if (!bg) return;
            const loadedMode = bg.mode || 'simple';
            showMode(loadedMode);

            if (loadedMode === 'simple') {
                // Restore simple toggle state
                simpleToggle.checked = !!bg.active;
                simpleStateOff.style.color = bg.active ? 'var(--text-muted)' : 'var(--text)';
                simpleStateOn.style.color = bg.active ? 'var(--success)' : 'var(--text-muted)';
                tooltipBox.classList.toggle('active', !!bg.active);
                tooltipBox.textContent = bg.active
                    ? '✓ Audio is being leveled automatically'
                    : 'Enable audio compression to level loud and quiet parts automatically';
                // Set intensity to match threshold
                const t = bg.threshold;
                let iv = 2;
                if (t <= -35) iv = 3;
                else if (t >= -25) iv = 1;
                intensitySlider.value = iv;
                intensityVal.textContent = INTENSITY_PRESETS[iv].label;
            } else {
                // Advanced mode
                const eq = bg.eq || {};
                state.bass = eq.bass || 0; state.mid = eq.mid || 0; state.treble = eq.treble || 0;
                ['threshold', 'ratio', 'attack', 'release', 'gain'].forEach(key => {
                    const sl = document.getElementById(`${key}-sl`);
                    const vl = document.getElementById(`${key}-val`);
                    if (sl) sl.value = bg[key] ?? sl.value;
                    if (vl) {
                        const v = parseFloat(sl ? sl.value : 0);
                        if (key === 'ratio') vl.textContent = `${v}:1`;
                        else if (key === 'attack' || key === 'release') vl.textContent = `${v} ms`;
                        else vl.textContent = `${v} dB`;
                    }
                });
                syncAdvancedView();
                compressBtn.textContent = bg.active ? 'Disable Compressor' : 'Enable Compressor';
                compressBtn.classList.toggle('active', !!bg.active);
                statusDot.classList.toggle('active', !!bg.active);

                let found = null;
                for (const [name, v] of Object.entries(EQ_PRESETS)) {
                    if (v.bass === state.bass && v.mid === state.mid && v.treble === state.treble) { found = name; break; }
                }
                if (found) {
                    presetBtns.forEach(p => p.classList.toggle('active', p.dataset.p === found));
                    isCustomPreset = false;
                } else {
                    presetBtns.forEach(p => p.classList.remove('active'));
                    isCustomPreset = true;
                }
                eqEnableBtn.classList.toggle('on', eq.enabled !== false);
                eqEnableBtn.textContent = eq.enabled !== false ? 'ON' : 'OFF';
            }
        });
    }

    init();
});
