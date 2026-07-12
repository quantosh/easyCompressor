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
    const root = document.getElementById('root');
    const vu = document.getElementById('vu');
    const ctx = vu.getContext('2d');
    vu.width = vu.clientWidth || 278; vu.height = 24;

    const statusDot = document.getElementById('statusDot');
    const reductionBadge = document.getElementById('reductionBadge');
    const gearBtn = document.getElementById('gearBtn');
    const enableBtn = document.getElementById('enableBtn');
    const eqToggle = document.getElementById('eqToggle');
    const eqSection = document.getElementById('eqSection');
    const eqEnableToggle = document.getElementById('eqEnableToggle');
    const presetBtns = document.querySelectorAll('[data-p]');
    const intensitySlider = document.getElementById('intensitySlider');
    const intensityVal = document.getElementById('intensityVal');
    const simpleStatus = document.getElementById('simpleStatus');

    let mode = 'simple';
    let isCustomPreset = false;

    chrome.runtime.onMessage.addListener(msg => {
        if (msg.action === 'audioLevel') drawMeter(msg.level, msg.reduction);
    });

    function setMode(m) {
        mode = m;
        root.classList.remove('mode-simple', 'mode-advanced');
        root.classList.add(`mode-${m}`);
        chrome.runtime.sendMessage({ action: 'setMode', mode: m }).catch(() => {});
    }

    function sendState(payload) {
        chrome.runtime.sendMessage({ action: 'updateState', ...payload }).catch(() => {});
    }

    // Shared enable button
    enableBtn.addEventListener('click', () => {
        const on = !enableBtn.classList.contains('active');
        enableBtn.textContent = on ? 'Disable Compressor' : 'Enable Compressor';
        enableBtn.classList.toggle('active', on);
        statusDot.classList.toggle('active', on);

        if (mode === 'simple') {
            if (on) {
                const val = parseInt(intensitySlider.value);
                const p = INTENSITY_PRESETS[val];
                sendState({ enabled: true, threshold: p.threshold, ratio: p.ratio,
                    attack: p.attack, release: p.release, gain: p.gain,
                    bass: 0, mid: 0, treble: 0, eqEnabled: false });
                simpleStatus.textContent = 'Leveling active';
                simpleStatus.className = 'simple-status on';
            } else {
                sendState({ enabled: false });
                simpleStatus.textContent = '';
                simpleStatus.className = 'simple-status';
            }
        } else {
            sendState({ enabled: on,
                threshold: document.getElementById('threshold-sl').value,
                ratio: document.getElementById('ratio-sl').value,
                attack: document.getElementById('attack-sl').value,
                release: document.getElementById('release-sl').value,
                gain: document.getElementById('gain-sl').value });
        }
    });

    // Intensity slider (simple mode)
    intensitySlider.addEventListener('input', () => {
        const val = parseInt(intensitySlider.value);
        intensityVal.textContent = INTENSITY_PRESETS[val].label;
        if (enableBtn.classList.contains('active')) {
            const p = INTENSITY_PRESETS[val];
            sendState({ threshold: p.threshold, ratio: p.ratio,
                attack: p.attack, release: p.release, gain: p.gain });
        }
    });

    // EQ toggle (advanced mode)
    eqToggle.addEventListener('click', () => {
        const vis = eqSection.classList.contains('hidden');
        eqSection.classList.toggle('hidden', !vis);
        eqToggle.classList.toggle('on', !vis);
    });

    eqEnableToggle.addEventListener('change', () => {
        sendState({ eqEnabled: eqEnableToggle.checked });
    });

    presetBtns.forEach(b => b.addEventListener('click', () => {
        presetBtns.forEach(p => p.classList.remove('active'));
        b.classList.add('active');
        const v = EQ_PRESETS[b.dataset.p];
        if (v) {
            isCustomPreset = false;
            syncEQView(v.bass, v.mid, v.treble);
            sendState({ bass: v.bass, mid: v.mid, treble: v.treble });
        }
    }));

    function syncEQView(bass, mid, treble) {
        document.getElementById('eq-bass-val').textContent = fmtDB(bass);
        document.getElementById('eq-mid-val').textContent = fmtDB(mid);
        document.getElementById('eq-treble-val').textContent = fmtDB(treble);
        document.getElementById('eq-bass-sl').value = bass;
        document.getElementById('eq-mid-sl').value = mid;
        document.getElementById('eq-treble-sl').value = treble;
    }

    function fmtDB(v) { return `${v > 0 ? '+' : ''}${v} dB`; }

    // Advanced compressor sliders
    ['threshold', 'ratio', 'attack', 'release', 'gain'].forEach(key => {
        const sl = document.getElementById(`${key}-sl`);
        const vl = document.getElementById(`${key}-val`);
        if (sl) sl.addEventListener('input', () => {
            const val = parseFloat(sl.value);
            const label = key === 'ratio' ? `${val}:1` : `${val} ms`;
            vl.textContent = key === 'ratio' || key === 'attack' || key === 'release' ? label : `${val} dB`;
            sendState({ [key]: val });
        });
    });

    // Advanced EQ sliders
    ['eq-bass', 'eq-mid', 'eq-treble'].forEach(key => {
        const sl = document.getElementById(`${key}-sl`);
        const vl = document.getElementById(`${key}-val`);
        if (sl) sl.addEventListener('input', () => {
            const val = parseFloat(sl.value);
            vl.textContent = fmtDB(val);
            if (!isCustomPreset) { isCustomPreset = true; presetBtns.forEach(p => p.classList.remove('active')); }
            sendState({ [key.replace('eq-', '')]: val });
        });
    });

    // Gear toggle
    gearBtn.addEventListener('click', () => {
        setMode(mode === 'simple' ? 'advanced' : 'simple');
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

    function init() {
        chrome.runtime.sendMessage({ action: 'getState' }, (bg) => {
            if (!bg) return;
            const loadedMode = bg.mode || 'simple';
            setMode(loadedMode);
            enableBtn.textContent = bg.active ? 'Disable Compressor' : 'Enable Compressor';
            enableBtn.classList.toggle('active', !!bg.active);
            statusDot.classList.toggle('active', !!bg.active);

            if (loadedMode === 'simple') {
                simpleStatus.textContent = bg.active ? 'Leveling active' : '';
                simpleStatus.className = bg.active ? 'simple-status on' : 'simple-status';
                const t = bg.threshold;
                let iv = 2;
                if (t <= -35) iv = 3;
                else if (t >= -25) iv = 1;
                intensitySlider.value = iv;
                intensityVal.textContent = INTENSITY_PRESETS[iv].label;
            } else {
                const eq = bg.eq || {};
                ['threshold', 'ratio', 'attack', 'release', 'gain'].forEach(key => {
                    const sl = document.getElementById(`${key}-sl`);
                    const vl = document.getElementById(`${key}-val`);
                    if (sl) sl.value = bg[key] ?? sl.value;
                    if (vl) {
                        const v = parseFloat(sl ? sl.value : 0);
                        vl.textContent = key === 'ratio' ? `${v}:1` : (key === 'attack' || key === 'release' ? `${v} ms` : `${v} dB`);
                    }
                });
                syncEQView(eq.bass || 0, eq.mid || 0, eq.treble || 0);
                let found = null;
                for (const [name, v] of Object.entries(EQ_PRESETS)) {
                    if (v.bass === (eq.bass || 0) && v.mid === (eq.mid || 0) && v.treble === (eq.treble || 0)) { found = name; break; }
                }
                if (found) { presetBtns.forEach(p => p.classList.toggle('active', p.dataset.p === found)); isCustomPreset = false; }
                else { presetBtns.forEach(p => p.classList.remove('active')); isCustomPreset = true; }
                eqEnableToggle.checked = eq.enabled !== false;
                eqToggle.classList.add('on');
                eqSection.classList.remove('hidden');
            }
        });
    }

    init();
});
