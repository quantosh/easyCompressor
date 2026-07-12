const EQ_PRESETS = {
    flat:       { bass: 0,  mid: 0,  treble: 0 },
    'bass-boost': { bass: 6,  mid: 0,  treble: 2 },
    voice:      { bass: -3, mid: 5,  treble: 3 },
    loudness:   { bass: 4,  mid: 0,  treble: 4 }
};

document.addEventListener('DOMContentLoaded', () => {
    const compressButton = document.getElementById('compressButton');
    const settingsButton = document.getElementById('settingsButton');
    const advancedControls = document.getElementById('advanced-controls');
    const thresholdSlider = document.getElementById('threshold-slider');
    const ratioSlider = document.getElementById('ratio-slider');
    const thresholdValue = document.getElementById('threshold-value');
    const ratioValue = document.getElementById('ratio-value');
    const meterCanvas = document.getElementById('meter-canvas');
    const statusDot = document.getElementById('statusDot');
    const reductionBadge = document.getElementById('reductionBadge');

    const eqBass = document.getElementById('eq-bass');
    const eqMid = document.getElementById('eq-mid');
    const eqTreble = document.getElementById('eq-treble');
    const eqBassValue = document.getElementById('eq-bass-value');
    const eqMidValue = document.getElementById('eq-mid-value');
    const eqTrebleValue = document.getElementById('eq-treble-value');
    const presetBtns = document.querySelectorAll('[data-preset]');

    let meterContext = null;
    if (meterCanvas) {
        meterCanvas.width = meterCanvas.clientWidth || 268;
        meterCanvas.height = 24;
        meterContext = meterCanvas.getContext('2d');
    }

    let isCompressorActive = false;
    let currentPreset = 'flat';
    let isCustom = false;

    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "audioLevel") {
            drawMeter(message.level, message.reduction);
        }
    });

    function updateUI(state) {
        if (compressButton) {
            if (state.active) {
                compressButton.textContent = "Disable Compressor";
                compressButton.classList.add('active');
            } else {
                compressButton.textContent = "Enable Compressor";
                compressButton.classList.remove('active');
            }
        }
        if (statusDot) {
            statusDot.classList.toggle('active', state.active);
        }
    }

    let lastLevel = 0;
    let lastReduction = 0;
    let peakLevel = 0;
    let peakDecay = 0;

    function drawMeter(level, reductionDb) {
        if (!meterCanvas || !meterContext) return;
        const w = meterCanvas.width;
        const h = meterCanvas.height;

        let scaled = Math.min(1, level * 1.5);
        const decay = 0.08;
        if (scaled > lastLevel) {
            lastLevel = scaled;
        } else {
            lastLevel = lastLevel * (1 - decay) + scaled * decay;
        }

        let reduction = 0;
        if (typeof reductionDb === 'number' && reductionDb < 0) {
            reduction = Math.min(1, Math.abs(reductionDb) / 24);
        }
        if (reduction > lastReduction) {
            lastReduction = reduction;
        } else {
            lastReduction = lastReduction * (1 - decay) + reduction * decay;
        }

        if (scaled > peakLevel) {
            peakLevel = scaled;
            peakDecay = 0;
        } else {
            peakDecay += 0.02;
            peakLevel = Math.max(0, peakLevel - peakDecay);
        }

        meterContext.clearRect(0, 0, w, h);
        const bgGrad = meterContext.createLinearGradient(0, 0, w, 0);
        bgGrad.addColorStop(0, '#68d391');
        bgGrad.addColorStop(0.5, '#ecc94b');
        bgGrad.addColorStop(1, '#f56565');
        meterContext.fillStyle = bgGrad;
        meterContext.fillRect(0, 0, w * lastLevel, h);

        meterContext.globalAlpha = 0.15;
        meterContext.fillStyle = '#fff';
        meterContext.fillRect(0, 0, w * lastLevel, h);
        meterContext.globalAlpha = 1;

        if (lastReduction > 0.01) {
            const rw = w * lastReduction;
            meterContext.fillStyle = 'rgba(245, 90, 90, 0.4)';
            meterContext.fillRect(Math.max(0, w * lastLevel - rw), 0, rw, h);
        }

        if (peakLevel > 0.01) {
            const px = w * peakLevel;
            meterContext.fillStyle = '#fff';
            meterContext.fillRect(px - 1, 0, 2, h);
        }

        if (reductionBadge) {
            reductionBadge.classList.toggle('visible', lastReduction > 0.02);
        }
    }

    function selectPreset(name) {
        currentPreset = name;
        isCustom = false;
        presetBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === name);
        });
        const vals = EQ_PRESETS[name];
        if (vals) {
            setEQValues(vals.bass, vals.mid, vals.treble);
            sendEQ();
        }
    }

    function setEQValues(bass, mid, treble) {
        if (eqBass) eqBass.value = bass;
        if (eqMid) eqMid.value = mid;
        if (eqTreble) eqTreble.value = treble;
        if (eqBassValue) eqBassValue.textContent = `${bass} dB`;
        if (eqMidValue) eqMidValue.textContent = `${mid} dB`;
        if (eqTrebleValue) eqTrebleValue.textContent = `${treble} dB`;
    }

    function sendEQ() {
        chrome.runtime.sendMessage({
            action: "updateEQ",
            bass: eqBass.value,
            mid: eqMid.value,
            treble: eqTreble.value
        });
    }

    function onEQSliderChange() {
        if (!isCustom) {
            isCustom = true;
            presetBtns.forEach(btn => btn.classList.remove('active'));
            currentPreset = 'custom';
        }
        const b = parseInt(eqBass.value);
        const m = parseInt(eqMid.value);
        const t = parseInt(eqTreble.value);
        if (eqBassValue) eqBassValue.textContent = `${b} dB`;
        if (eqMidValue) eqMidValue.textContent = `${m} dB`;
        if (eqTrebleValue) eqTrebleValue.textContent = `${t} dB`;
        sendEQ();
    }

    function init() {
        chrome.runtime.sendMessage({ action: "getState" }, (state) => {
            if (state) {
                isCompressorActive = state.active;
                if (thresholdSlider) thresholdSlider.value = state.threshold;
                if (ratioSlider) ratioSlider.value = state.ratio;
                if (thresholdValue) thresholdValue.textContent = `${state.threshold} dB`;
                if (ratioValue) ratioValue.textContent = `${state.ratio}:1`;
                updateUI(state);

                if (state.eq) {
                    const eq = state.eq;
                    setEQValues(eq.bass, eq.mid, eq.treble);

                    let found = false;
                    for (const [name, vals] of Object.entries(EQ_PRESETS)) {
                        if (vals.bass === eq.bass && vals.mid === eq.mid && vals.treble === eq.treble) {
                            selectPreset(name);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        isCustom = true;
                        presetBtns.forEach(btn => btn.classList.remove('active'));
                    }
                }
            }
        });
    }

    if (compressButton) {
        compressButton.addEventListener('click', () => {
            isCompressorActive = !isCompressorActive;
            const message = {
                action: "toggleCompressor",
                active: isCompressorActive,
                threshold: thresholdSlider.value,
                ratio: ratioSlider.value
            };
            chrome.runtime.sendMessage(message, () => updateUI({ ...message }));
        });
    }

    if (settingsButton && advancedControls) {
        settingsButton.addEventListener('click', () => {
            advancedControls.classList.toggle('visible');
        });
    }

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => selectPreset(btn.dataset.preset));
    });

    if (eqBass) eqBass.addEventListener('input', onEQSliderChange);
    if (eqMid) eqMid.addEventListener('input', onEQSliderChange);
    if (eqTreble) eqTreble.addEventListener('input', onEQSliderChange);

    function sendSettingsUpdate() {
        chrome.runtime.sendMessage({
            action: "updateSettings",
            threshold: thresholdSlider.value,
            ratio: ratioSlider.value
        });
    }

    if (thresholdSlider && thresholdValue) {
        thresholdSlider.addEventListener('input', () => {
            thresholdValue.textContent = `${thresholdSlider.value} dB`;
            sendSettingsUpdate();
        });
    }

    if (ratioSlider && ratioValue) {
        ratioSlider.addEventListener('input', () => {
            ratioValue.textContent = `${ratioSlider.value}:1`;
            sendSettingsUpdate();
        });
    }

    init();
    drawMeter(0);
});
