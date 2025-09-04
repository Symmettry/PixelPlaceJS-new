window.addEventListener("from-userscript", (e) => {
    const { id, data } = e.detail;

    chrome.runtime.sendMessage(data, (response) => {
        if(id == -1 || response == null) return;
        window.dispatchEvent(new CustomEvent("extension", {
            detail: { id, response }
        }));
    });
});

chrome.runtime.onMessage.addListener((message) => {
    window.dispatchEvent(new CustomEvent("extension", {
        detail: { id: message[0], response: message[1] }
    }));
});

window.addEventListener("beforeunload", () => {
    chrome.runtime.sendMessage({ type: "disconnect-ws" });
});