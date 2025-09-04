let sockets = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab.id;
    switch(message.type) {
        case "connect-ws": {
            const port = message.port;
            if (!port || isNaN(port)) {
                sendResponse({ error: "Invalid port" });
                return false;
            }

            try {
                const ws = new WebSocket(`ws://localhost:${port}`);
                sockets[tabId] = ws;

                ws.onopen = () => {
                    console.log(`Connected to PPJS on port ${port}`);
                    sendResponse({ success: true });
                };

                ws.onmessage = (event) => {
                    chrome.tabs.sendMessage(tabId, [0, event.data]);
                };

                ws.onclose = () => {
                    console.log("WebSocket closed");
                    chrome.tabs.sendMessage(tabId, [6]);
                }
                ws.onerror = (err) => {
                    console.error("WebSocket error:", err);
                    chrome.tabs.sendMessage(tabId, [7, err]);
                }
            } catch (err) {
                sendResponse({ error: err.toString() });
            }
            return true;
        }
        case "send-to-ws": {
            const ws = sockets[tabId];
            if(!ws || ws.readyState != WebSocket.OPEN) return;
            ws.send(message.data);
            sendResponse({ response: "Success" });
            return false;
        }
        case "disconnect-ws": {
            if(!sockets[tabId]) return;
            sockets[tabId].close();
            delete sockets[tabId];
            return true;
        }
    }
});
