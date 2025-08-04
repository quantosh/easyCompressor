// background.js
// Gestiona el estado del compresor para la extensión

let compressorState = {
    active: false,
    threshold: -30,
    ratio: 8
};



// Escucha los mensajes del popup y content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleCompressor") {
        compressorState = {
            ...compressorState,
            active: request.active,
            threshold: request.threshold,
            ratio: request.ratio
        };
        updateActiveTab();
    } else if (request.action === "updateSettings") {
        compressorState = {
            ...compressorState,
            threshold: request.threshold,
            ratio: request.ratio
        };
        updateActiveTab();
    } else if (request.action === "getState") {
        sendResponse(compressorState);
        return true;
    } else if (request.action === "audioLevel") {
        // Reenviar el nivel de audio al popup (todas las ventanas del popup abiertas)
        chrome.windows.getAll({populate:true}, function(windows) {
            windows.forEach(function(win) {
                win.tabs.forEach(function(tab) {
                    if (tab.url && tab.url.includes('popup.html')) {
                        chrome.tabs.sendMessage(tab.id, { action: "audioLevel", level: request.level }).catch(()=>{});
                    }
                });
            });
        });
    }
});

// Función para inyectar el script y enviar la configuración a la pestaña activa
function updateActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content.js']
            }).then(() => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "updateState",
                    ...compressorState
                }).catch(err => console.error("Error al enviar mensaje a la pestaña activa:", err));
            }).catch(err => console.error("Error al inyectar script en la pestaña activa:", err));
        }
    });
}