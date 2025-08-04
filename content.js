// content.js
let audioContext = null;
let source = null;
let compressor = null;
let analyser = null;
let gainNode = null;
let mediaElement = null;
let isCompressorEnabled = false;
let animationFrameId = null;

function initializeAudio(element) {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (mediaElement !== element) {
            mediaElement = element;
            if (source) {
                source.disconnect();
            }
            source = audioContext.createMediaElementSource(element);
        }

        if (!compressor) {
            compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.value = -30;
            compressor.knee.value = 40;
            compressor.ratio.value = 8;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;
        }

        if (!analyser) {
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
        }

        if (!gainNode) {
            gainNode = audioContext.createGain();
            gainNode.gain.value = 1.0;
        }

        // Reconectar nodos según el estado del compresor
        reconnectAudioGraph();
        startMeter();
    } catch (error) {
        console.error('Error initializing audio:', error);
    }
}

function reconnectAudioGraph() {
    if (!source || !analyser || !gainNode) return;
    try {
        // Desconecta todo de gainNode primero
        try { gainNode.disconnect(); } catch (e) {}
        try { analyser.disconnect(); } catch (e) {}
        try { compressor.disconnect(); } catch (e) {}
        try { source.disconnect(); } catch (e) {}

        if (isCompressorEnabled) {
            // source -> compressor -> analyser -> gainNode -> destination
            try { source.connect(compressor); } catch (e) {}
            try { compressor.connect(analyser); } catch (e) {}
            try { analyser.connect(gainNode); } catch (e) {}
        } else {
            // source -> analyser -> gainNode -> destination
            try { source.connect(analyser); } catch (e) {}
            try { analyser.connect(gainNode); } catch (e) {}
        }
        try { gainNode.connect(audioContext.destination); } catch (e) {}
    } catch (error) {
        // Puede fallar si ya están desconectados
    }
}

function updateCompressor(state) {
    if (!compressor || !source || !gainNode) return;

    const fadeTime = 0.05; // 50ms
    try {
        const now = audioContext.currentTime;
        // Fade out
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0.0, now + fadeTime);

        setTimeout(() => {
            if (state.active && !isCompressorEnabled) {
                isCompressorEnabled = true;
                reconnectAudioGraph();
            } else if (!state.active && isCompressorEnabled) {
                isCompressorEnabled = false;
                reconnectAudioGraph();
            }

            if (state.active) {
                if (state.threshold !== undefined) compressor.threshold.value = parseFloat(state.threshold);
                if (state.ratio !== undefined) compressor.ratio.value = parseFloat(state.ratio);
            }

            // Fade in
            const after = audioContext.currentTime;
            gainNode.gain.cancelScheduledValues(after);
            gainNode.gain.setValueAtTime(0.0, after);
            gainNode.gain.linearRampToValueAtTime(1.0, after + fadeTime);
        }, fadeTime * 1000);
    } catch (error) {
        console.error('Error updating compressor:', error);
    }
}

function setupAudioProcessing() {
    const mediaElements = document.querySelectorAll('video, audio');
    if (mediaElements.length === 0) return;

    // Solo procesamos el primer elemento multimedia encontrado
    const element = mediaElements[0];
    if (!element.src && !element.querySelector('source')) return;

    initializeAudio(element);
}

// Listener para mensajes desde el popup
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'updateState') {
        setupAudioProcessing();
        updateCompressor(request);
    }
});

// Medidor de nivel de audio y envío al popup
function startMeter() {
    if (!analyser) return;
    if (animationFrameId) return; // Ya corriendo
    function updateMeter() {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const val = (dataArray[i] - 128) / 128;
            sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        let reduction = 0;
        if (compressor && isCompressorEnabled) {
            reduction = compressor.reduction || 0;
        }
        chrome.runtime.sendMessage({ action: "audioLevel", level: rms, reduction });
        animationFrameId = requestAnimationFrame(updateMeter);
    }
    updateMeter();
}

// Configuración inicial cuando se carga la página
setTimeout(setupAudioProcessing, 1000);
