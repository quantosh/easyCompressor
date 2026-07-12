let compressorState = {
    active: false,
    threshold: -30,
    ratio: 8
};

let eqState = {
    bass: 0,
    mid: 0,
    treble: 0
};

function saveState() {
    chrome.storage.local.set({
        compressor: compressorState,
        eq: eqState
    }).catch(() => {});
}

function loadState() {
    chrome.storage.local.get(['compressor', 'eq'], (result) => {
        if (result.compressor) compressorState = { ...compressorState, ...result.compressor };
        if (result.eq) eqState = { ...eqState, ...result.eq };
    });
}

loadState();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleCompressor") {
        compressorState = {
            ...compressorState,
            active: request.active,
            threshold: request.threshold,
            ratio: request.ratio
        };
        saveState();
        updateActiveTab();
    } else if (request.action === "updateSettings") {
        compressorState = {
            ...compressorState,
            threshold: request.threshold,
            ratio: request.ratio
        };
        saveState();
        updateActiveTab();
    } else if (request.action === "updateEQ") {
        eqState = {
            bass: parseFloat(request.bass),
            mid: parseFloat(request.mid),
            treble: parseFloat(request.treble)
        };
        saveState();
        updateActiveTab();
    } else if (request.action === "getState") {
        sendResponse({ ...compressorState, eq: eqState });
        return true;
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
            }).catch(err => console.error("Error al enviar mensaje a la pestaña activa:", err));
        }
    });
}
