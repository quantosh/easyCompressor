// popup.js
// Lógica de la interfaz de usuario

document.addEventListener('DOMContentLoaded', () => {
    const title = document.getElementById('title');
    const description = document.getElementById('description');
    const compressButton = document.getElementById('compressButton');
    const settingsButton = document.getElementById('settingsButton');
    const advancedControls = document.getElementById('advanced-controls');
    const thresholdSlider = document.getElementById('threshold-slider');
    const ratioSlider = document.getElementById('ratio-slider');
    const thresholdValue = document.getElementById('threshold-value');
    const ratioValue = document.getElementById('ratio-value');
    const meterCanvas = document.getElementById('meter-canvas');
    let meterContext = null;
    if (meterCanvas) {
        meterCanvas.width = 240;
        meterCanvas.height = 20;
        meterContext = meterCanvas.getContext('2d');
    }

    let isCompressorActive = false;

    // Escuchar los niveles de audio reenviados por background
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "audioLevel") {
            drawMeter(message.level, message.reduction);
        }
    });

    // Asegúrate de que los elementos existen antes de interactuar con ellos
    if (title) title.textContent = "Easy Compressor";
    if (description) description.textContent = "Click to apply audio compression on the current tab.";

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
    }

    // Suavizado visual y escalado para el vumeter
    let lastLevel = 0;
    let lastReduction = 0;
    function drawMeter(level, reductionDb) {
        if (!meterCanvas) return;
        if (!meterContext) {
            meterContext = meterCanvas.getContext('2d');
        }
        // Escalado ajustado para que la barra no esté tan exagerada
        let scaled = Math.min(1, level * 1.5);
        // Suavizado: peak hold y decay
        const decay = 0.08;
        if (scaled > lastLevel) {
            lastLevel = scaled;
        } else {
            lastLevel = lastLevel * (1 - decay) + scaled * decay;
        }
        // Suavizado para la reducción
        let reduction = 0;
        if (typeof reductionDb === 'number' && reductionDb < 0) {
            // reductionDb es negativo, lo convertimos a positivo y lo escalamos
            reduction = Math.min(1, Math.abs(reductionDb) / 24); // 24dB = barra completa
        }
        if (reduction > lastReduction) {
            lastReduction = reduction;
        } else {
            lastReduction = lastReduction * (1 - decay) + reduction * decay;
        }
        const width = meterCanvas.width;
        const height = meterCanvas.height;
        const barWidth = Math.min(width * lastLevel, width);
        // Limpiar el canvas
        meterContext.clearRect(0, 0, width, height);
        // Dibujar el fondo
        meterContext.fillStyle = '#4a5568';
        meterContext.fillRect(0, 0, width, height);
        // Dibujar la barra de nivel (input/output)
        const gradient = meterContext.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#68d391');
        gradient.addColorStop(0.6, '#ecc94b');
        gradient.addColorStop(1, '#f56565');
        meterContext.fillStyle = gradient;
        meterContext.fillRect(0, 0, barWidth, height);
        // Dibujar la reducción de ganancia como superposición roja
        if (lastReduction > 0.01) {
            const reductionWidth = width * lastReduction;
            meterContext.fillStyle = 'rgba(255,0,0,0.6)';
            meterContext.fillRect(barWidth - reductionWidth, 0, reductionWidth, height);
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

    // Ya no es necesario escuchar por onMessage aquí, solo por port.onMessage

    init();
    drawMeter(0);
});