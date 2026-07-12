let audioContext = null;
let source = null;
let compressor = null;
let makeupGain = null;
let eqBass = null;
let eqMid = null;
let eqTreble = null;
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
            if (source) source.disconnect();
            source = audioContext.createMediaElementSource(element);
        }

        if (!eqBass) {
            eqBass = audioContext.createBiquadFilter();
            eqBass.type = 'lowshelf'; eqBass.frequency.value = 250; eqBass.gain.value = 0;
        }
        if (!eqMid) {
            eqMid = audioContext.createBiquadFilter();
            eqMid.type = 'peaking'; eqMid.frequency.value = 1000; eqMid.Q.value = 0.7; eqMid.gain.value = 0;
        }
        if (!eqTreble) {
            eqTreble = audioContext.createBiquadFilter();
            eqTreble.type = 'highshelf'; eqTreble.frequency.value = 4000; eqTreble.gain.value = 0;
        }

        if (!compressor) {
            compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.value = -30; compressor.knee.value = 40; compressor.ratio.value = 8;
            compressor.attack.value = 0.003; compressor.release.value = 0.25;
        }

        if (!makeupGain) {
            makeupGain = audioContext.createGain();
            makeupGain.gain.value = 1.0;
        }

        if (!analyser) {
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
        }

        if (!gainNode) {
            gainNode = audioContext.createGain();
            gainNode.gain.value = 1.0;
        }

        reconnectAudioGraph();
        startMeter();
    } catch (error) {
        console.error('Error initializing audio:', error);
    }
}

function reconnectAudioGraph() {
    if (!source || !analyser || !gainNode) return;
    try {
        try { gainNode.disconnect(); } catch (e) {}
        try { makeupGain.disconnect(); } catch (e) {}
        try { analyser.disconnect(); } catch (e) {}
        try { compressor.disconnect(); } catch (e) {}
        try { eqTreble.disconnect(); } catch (e) {}
        try { eqMid.disconnect(); } catch (e) {}
        try { eqBass.disconnect(); } catch (e) {}
        try { source.disconnect(); } catch (e) {}

        try { source.connect(eqBass); } catch (e) {}
        try { eqBass.connect(eqMid); } catch (e) {}
        try { eqMid.connect(eqTreble); } catch (e) {}

        if (isCompressorEnabled) {
            try { eqTreble.connect(compressor); } catch (e) {}
            try { compressor.connect(makeupGain); } catch (e) {}
        } else {
            try { eqTreble.connect(makeupGain); } catch (e) {}
        }

        try { makeupGain.connect(analyser); } catch (e) {}
        try { analyser.connect(gainNode); } catch (e) {}
        try { gainNode.connect(audioContext.destination); } catch (e) {}
    } catch (error) {}
}

function updateCompressor(state) {
    if (!compressor || !source || !gainNode) return;

    if (state.eq) applyEQ(state.eq);

    if (state.threshold !== undefined) compressor.threshold.value = parseFloat(state.threshold);
    if (state.ratio !== undefined) compressor.ratio.value = parseFloat(state.ratio);
    if (state.attack !== undefined) compressor.attack.value = parseFloat(state.attack) / 1000;
    if (state.release !== undefined) compressor.release.value = parseFloat(state.release) / 1000;
    if (state.gain !== undefined) makeupGain.gain.value = Math.max(1, 1 + parseFloat(state.gain) / 20);

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

            const after = audioContext.currentTime;
            gainNode.gain.setValueAtTime(0.001, after);
            gainNode.gain.linearRampToValueAtTime(1.0, after + fadeTime);
        }, fadeTime * 1000);
    } catch (error) {
        console.error('Error updating compressor:', error);
    }
}

function applyEQ(eq) {
    if (!eqBass || !eqMid || !eqTreble) return;
    if (eq) {
        if (eq.bass !== undefined) eqBass.gain.value = parseFloat(eq.bass);
        if (eq.mid !== undefined) eqMid.gain.value = parseFloat(eq.mid);
        if (eq.treble !== undefined) eqTreble.gain.value = parseFloat(eq.treble);
    }
}

function setupAudioProcessing() {
    const mediaElements = document.querySelectorAll('video, audio');
    if (mediaElements.length === 0) return;
    const element = mediaElements[0];
    if (!element.src && !element.querySelector('source')) return;
    initializeAudio(element);
}

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'updateState') {
        setupAudioProcessing();
        updateCompressor(request);
    }
});

function startMeter() {
    if (!analyser) return;
    if (animationFrameId) return;
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

function trySetup() {
    if (!audioContext) setupAudioProcessing();
}

setTimeout(trySetup, 1000);

const setupObserver = new MutationObserver(() => {
    if (!audioContext && document.querySelector('video, audio')) setupAudioProcessing();
});
if (document.body) {
    setupObserver.observe(document.body, { childList: true, subtree: true });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setupObserver.observe(document.body, { childList: true, subtree: true });
    });
}
