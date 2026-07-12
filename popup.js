const EQ_PRESETS = {
    flat:  { bass: 0,  mid: 0,  treble: 0 },
    bass:  { bass: 6,  mid: 0,  treble: 2 },
    voice: { bass: -3, mid: 5,  treble: 3 },
    loud:  { bass: 4,  mid: 0,  treble: 4 }
};

const COMP_SLIDERS = [
    { id: 'threshold-sl', valId: 'threshold-val', min: -60, max: 0, step: 1, key: 'threshold', fmt: v => `${v} dB` },
    { id: 'ratio-sl',    valId: 'ratio-val',    min: 1,   max: 20, step: 1, key: 'ratio',    fmt: v => `${v}:1` },
    { id: 'attack-sl',   valId: 'attack-val',   min: 0,   max: 200, step: 1, key: 'attack',   fmt: v => `${v} ms` },
    { id: 'release-sl',  valId: 'release-val',  min: 10,  max: 1000, step: 10, key: 'release', fmt: v => `${v} ms` },
    { id: 'gain-sl',     valId: 'gain-val',     min: 0,   max: 24,  step: 1, key: 'gain',     fmt: v => `${v} dB` }
];

const EQ_SLIDERS = [
    { id: 'eq-bass-sl',   valId: 'eq-bass-val',   min: -12, max: 12, step: 1, key: 'bass',   fmt: v => `${v > 0 ? '+' : ''}${v} dB` },
    { id: 'eq-mid-sl',    valId: 'eq-mid-val',    min: -12, max: 12, step: 1, key: 'mid',    fmt: v => `${v > 0 ? '+' : ''}${v} dB` },
    { id: 'eq-treble-sl', valId: 'eq-treble-val', min: -12, max: 12, step: 1, key: 'treble', fmt: v => `${v > 0 ? '+' : ''}${v} dB` }
];

document.addEventListener('DOMContentLoaded', () => {
    const compressBtn = document.getElementById('compressBtn');
    const eqToggle = document.getElementById('eqToggle');
    const eqSection = document.getElementById('eqSection');
    const eqEnableBtn = document.getElementById('eqEnableBtn');
    const vu = document.getElementById('vu');
    const statusDot = document.getElementById('statusDot');
    const reductionBadge = document.getElementById('reductionBadge');
    const presetBtns = document.querySelectorAll('[data-p]');

    let ctx = vu.getContext('2d');
    vu.width = vu.clientWidth || 278;
    vu.height = 24;

    let state = { enabled: false, eqOn: true, eqEnabled: true, bass: 0, mid: 0, treble: 0, threshold: -30, ratio: 8, attack: 3, release: 250, gain: 0 };
    let isCustom = false;

    chrome.runtime.onMessage.addListener(msg => {
        if (msg.action === 'audioLevel') drawMeter(msg.level, msg.reduction);
    });

    function updateUI() {
        compressBtn.textContent = state.enabled ? 'Disable Compressor' : 'Enable Compressor';
        compressBtn.classList.toggle('active', state.enabled);
        statusDot.classList.toggle('active', state.enabled);
    }

    function setSliderVal(slider, val) {
        const sl = document.getElementById(slider.id);
        const vl = document.getElementById(slider.valId);
        if (sl) sl.value = val;
        if (vl) vl.textContent = slider.fmt(val);
    }

    function readSlider(slider) {
        const sl = document.getElementById(slider.id);
        return sl ? parseFloat(sl.value) : 0;
    }

    function sendState() {
        chrome.runtime.sendMessage({ action: 'updateState', ...state }).catch(() => {});
    }

    function setPreset(name) {
        const v = EQ_PRESETS[name];
        if (!v) return;
        state.bass = v.bass; state.mid = v.mid; state.treble = v.treble;
        EQ_SLIDERS.forEach(s => setSliderVal(s, state[s.key]));
        presetBtns.forEach(b => b.classList.toggle('active', b.dataset.p === name));
        isCustom = false;
        sendState();
    }

    function onEQChange() {
        if (!isCustom) {
            isCustom = true;
            presetBtns.forEach(b => b.classList.remove('active'));
        }
        state.bass = readSlider(EQ_SLIDERS[0]);
        state.mid = readSlider(EQ_SLIDERS[1]);
        state.treble = readSlider(EQ_SLIDERS[2]);
        EQ_SLIDERS.forEach(s => {
            const vl = document.getElementById(s.valId);
            if (vl) vl.textContent = s.fmt(state[s.key]);
        });
        sendState();
    }

    function onCompChange() {
        COMP_SLIDERS.forEach(s => {
            state[s.key] = readSlider(s);
            const vl = document.getElementById(s.valId);
            if (vl) vl.textContent = s.fmt(state[s.key]);
        });
        sendState();
    }

    compressBtn.addEventListener('click', () => {
        state.enabled = !state.enabled;
        updateUI();
        sendState();
    });

    eqToggle.addEventListener('click', () => {
        state.eqOn = !state.eqOn;
        eqToggle.classList.toggle('on', state.eqOn);
        eqSection.classList.toggle('hidden', !state.eqOn);
    });

    eqEnableBtn.addEventListener('click', () => {
        state.eqEnabled = !state.eqEnabled;
        eqEnableBtn.classList.toggle('on', state.eqEnabled);
        eqEnableBtn.textContent = state.eqEnabled ? 'ON' : 'OFF';
        sendState();
    });

    presetBtns.forEach(b => b.addEventListener('click', () => setPreset(b.dataset.p)));

    COMP_SLIDERS.forEach(s => {
        const el = document.getElementById(s.id);
        if (el) el.addEventListener('input', onCompChange);
    });

    EQ_SLIDERS.forEach(s => {
        const el = document.getElementById(s.id);
        if (el) el.addEventListener('input', onEQChange);
    });

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

    function init() {
        chrome.runtime.sendMessage({ action: 'getState' }, (bg) => {
            if (!bg) return;
            state.enabled = !!bg.active;
            state.threshold = bg.threshold ?? -30;
            state.ratio = bg.ratio ?? 8;
            state.attack = bg.attack ?? 3;
            state.release = bg.release ?? 250;
            state.gain = bg.gain ?? 0;
            COMP_SLIDERS.forEach(s => setSliderVal(s, state[s.key]));
            updateUI();

            const eq = bg.eq || {};
            state.bass = eq.bass ?? 0;
            state.mid = eq.mid ?? 0;
            state.treble = eq.treble ?? 0;
            EQ_SLIDERS.forEach(s => setSliderVal(s, state[s.key]));
            let found = null;
            for (const [name, v] of Object.entries(EQ_PRESETS)) {
                if (v.bass === state.bass && v.mid === state.mid && v.treble === state.treble) { found = name; break; }
            }
            if (found) { presetBtns.forEach(b => b.classList.toggle('active', b.dataset.p === found)); isCustom = false; }
            else { presetBtns.forEach(b => b.classList.remove('active')); isCustom = true; }
        });
    }

    init();
});
