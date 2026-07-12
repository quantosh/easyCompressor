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

    let meterContext = null;
    if (meterCanvas) {
        meterCanvas.width = meterCanvas.clientWidth || 268;
        meterCanvas.height = 24;
        meterContext = meterCanvas.getContext('2d');
    }

    let isCompressorActive = false;

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

    function init() {
        chrome.runtime.sendMessage({ action: "getState" }, (state) => {
            if (state) {
                isCompressorActive = state.active;
                if (thresholdSlider) thresholdSlider.value = state.threshold;
                if (ratioSlider) ratioSlider.value = state.ratio;
                if (thresholdValue) thresholdValue.textContent = `${state.threshold} dB`;
                if (ratioValue) ratioValue.textContent = `${state.ratio}:1`;
                updateUI(state);
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
