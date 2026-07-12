let compressorState = {
    active: false,
    threshold: -30,
    ratio: 8,
    attack: 3,
    release: 250,
    gain: 0
};

let eqState = {
    enabled: false,
    bass: 0,
    mid: 0,
    treble: 0
};

function saveState() {
    chrome.storage.local.set({ compressor: compressorState, eq: eqState, mode: modePref }).catch(() => {});
}

function loadState() {
    chrome.storage.local.get(['compressor', 'eq', 'mode'], (result) => {
        if (result.compressor) compressorState = { ...compressorState, ...result.compressor };
        if (result.eq) eqState = { ...eqState, ...result.eq };
        if (result.mode) modePref = result.mode;
    });
}

let modePref = 'simple';

loadState();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateState") {
        if (request.enabled !== undefined) compressorState.active = !!request.enabled;
        if (request.threshold !== undefined) compressorState.threshold = parseFloat(request.threshold);
        if (request.ratio !== undefined) compressorState.ratio = parseFloat(request.ratio);
        if (request.attack !== undefined) compressorState.attack = parseFloat(request.attack);
        if (request.release !== undefined) compressorState.release = parseFloat(request.release);
        if (request.gain !== undefined) compressorState.gain = parseFloat(request.gain);
        if (request.eqEnabled !== undefined) eqState.enabled = !!request.eqEnabled;
        if (request.bass !== undefined) eqState.bass = parseFloat(request.bass);
        if (request.mid !== undefined) eqState.mid = parseFloat(request.mid);
        if (request.treble !== undefined) eqState.treble = parseFloat(request.treble);
        saveState();
        updateActiveTab();
    } else if (request.action === "getState") {
        sendResponse({ ...compressorState, eq: eqState, mode: modePref });
        return true;
    } else if (request.action === "setMode") {
        modePref = request.mode;
        chrome.storage.local.set({ mode: modePref }).catch(() => {});
    } else if (request.action === "audioLevel") {
        chrome.runtime.sendMessage({ action: "audioLevel", level: request.level, reduction: request.reduction }).catch(() => {});
    }
});

function updateActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "updateState",
                ...compressorState,
                eq: eqState
            }).catch(() => {});
        }
    });
}
