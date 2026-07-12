// content.js
let audioContext = null;
let source = null;
let compressor = null;
let analyser = null;
let gainNode = null;
let mediaElement = null;
let isCompressorEnabled = false;
let animationFrameId = null;
let pendingUpdate = null;

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

    const fadeTime = 0.05;
    try {
        if (pendingUpdate) {
            clearTimeout(pendingUpdate);
            pendingUpdate = null;
        }

        const now = audioContext.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0.001, now + fadeTime);

        pendingUpdate = setTimeout(() => {
            pendingUpdate = null;
            const shouldBeActive = state.active;

            if (shouldBeActive && !isCompressorEnabled) {
                isCompressorEnabled = true;
                reconnectAudioGraph();
            } else if (!shouldBeActive && isCompressorEnabled) {
                isCompressorEnabled = false;
                reconnectAudioGraph();
            }

            if (shouldBeActive) {
                if (state.threshold !== undefined) compressor.threshold.value = parseFloat(state.threshold);
                if (state.ratio !== undefined) compressor.ratio.value = parseFloat(state.ratio);
            }

            const after = audioContext.currentTime;
            gainNode.gain.setValueAtTime(0.001, after);
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

// Intenta inicializar al cargar la página
function trySetup() {
    if (!audioContext) {
        setupAudioProcessing();
    }
}

setTimeout(trySetup, 1000);

// Observa cambios en el DOM para detectar elementos multimedia agregados dinámicamente
const setupObserver = new MutationObserver(() => {
    if (!audioContext && document.querySelector('video, audio')) {
        setupAudioProcessing();
    }
});
if (document.body) {
    setupObserver.observe(document.body, { childList: true, subtree: true });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setupObserver.observe(document.body, { childList: true, subtree: true });
    });
}
