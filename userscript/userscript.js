// ==UserScript==
// @name         PPJS Userscript Hook
// @version      v1.0
// @description  Hooks PPJS to a userscript
// @author       Symmettry/lilyorb
// @match        https://pixelplace.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pixelplace.io
// @grant        none
// @run-at       document-start
// ==/UserScript==

/** MAIN */

// info
let userID, width, height, premium, username, template;
const boardID = parseInt(window.location.pathname.substring(1));

// menu
let menuData, currentMenuTag = "";
let currentMenu;
let overlay;
let texts, toggles, inputs, buttons;
let lastLeft = 75, lastTop = 20, previousMenu = "";

// socket
const callbacks = {
    0: (d) => {
        const code = d.charCodeAt(0);
        const packet = d.substring(1);
        handlers[code]?.(packet);
    },
    6: () => {
        settings = {};
        if(menuData) {
            parseMenuJSON();
        }
    }
};

Object.defineProperty(console, 'log', {value: console.log, configurable: false, writable: false});
Object.defineProperty(console, 'error', {value: console.error, configurable: false, writable: false});

let settings = {};
let lastError;

/** WEBSOCKET HOOK */
const OGWS = window.WebSocket;
let pxpSocket;
window.WebSocket = class WSH extends OGWS {
    constructor(url, params) {
        super(url, params);
        pxpSocket = this;
        this._onmessage = null;
        super.onmessage = event => {
            if (this._onmessage) {
                this._onmessage(event);
            }
        };
    }
    send(msg) {
        if(settings.browserClient) {
            console.log("requesting", msg);
            emit(CC.PACKET_REQUEST, msg);
            return;
        }
        super.send(msg);
    }
    superSend(msg) {
        super.send(msg);
    }
    set onmessage(handler) {
        window.ppHandler = handler;
        this._onmessage = msgEvent => {
            if(msgEvent.data == '42["chat.messages.loaded",1]'){
                setTimeout(() => {
                    parseMenuJSON();
                    setInterval(() => {
                        if(document.getElementById("ppjs") == null) parseMenuJSON();
                    }, 2000);
                }, 1000);
            } else if(settings.browserClient) {
                onMsg(msgEvent.data);
            }
            handler?.(msgEvent);
        };
    }

    get onmessage() {
        return this._onmessage;
    }
};

window.fakeMessage = (data) => {
    window.ppHandler(new MessageEvent("message", { data }));
};
window.fakeChat = (mData) => {
    window.fakeMessage(`42["chat.user.message",${JSON.stringify(mData)}]`);
};

/** XML HOOK */
function patchAjax() {
    const originalAjax = $.ajax;

    $.ajax = function(options) {
        const originalSuccess = options.success;

        options.success = function(data, textStatus, jqXHR) {
            switch(options.url) {
                case "/api/get-painting.php?id=7&connected=1": {
                    userID = data.user.id;
                    width = data.painting.width;
                    height = data.painting.height;
                    premium = data.user.premium.active;
                    username = data.user.name;
                    template = data.painting.template;
                    break;
                }
            }
            if (typeof originalSuccess === "function") {
                originalSuccess(data, textStatus, jqXHR);
            }
        };

        return originalAjax.call(this, options);
    };
}

if (typeof window.$ !== "undefined" && typeof window.$.ajax === "function") {
    patchAjax();
    return;
}

const observer = new MutationObserver(() => {
    if (typeof window.$ !== "undefined" && typeof window.$.ajax === "function") {
        observer.disconnect();
        patchAjax();
    }
});

observer.observe(document.documentElement, { childList: true, subtree: true });

/** DISPLAY */

async function getMenuJSON() {
    return `({
        defaultMenu: "main",
        errorMenu: "error",
        openMenu: "open",

        globalStyle: "position: fixed; z-index:9999; border-radius:8px; box-shadow:0 0 10px rgba(0,0,0,0.5); user-select:none; color:#fff; background-color:rgba(0,0,0,0.8); padding:10px;",
        globalObjects: [
            {
                type: "text",
                text: "PixelPlaceJS",
                style: "font-weight:bold; margin-bottom:10px; position: absolute;"
            },
        ],

        menus: {
            main: {
                style: "width:200px; height:100px",
                objects: [
                    {
                         type: "text",
                         text: "Not Connected",
                         style: "color:red; position: absolute; top:30px;"
                    },
                    {
                         type: "button",
                         text: "-",
                         onClick: () => loadMenu("minimized"),
                         style: "position: absolute; top: -50px; font-size: 1.5em; right: -5px; color:gray; width: 10px; background-color: rgba(0,0,0,0);"
                    },
                    {
                         type: "input",
                         text: "Port",
                         textStyle: "position: absolute; font-size: 0.85em; top: 60px;",
                         placeholder: "####",
                         defaultText: "8080",
                         style: "position: absolute; left: 30px; background-color: rgba(0,0,0,0.9); width:37px; top:0.5px;",
                         id: "port"
                    },
                    {
                        type: "button",
                        text: "Connect",
                        style: "position: absolute; top: 65px; padding: 1px 5px; font-size: 0.85em;",
                        onClick: () => { connect(id("port").value, "main"); loadMenu("connecting"); }
                    }
                ]
            },
            minimized: {
                style: "width: 130px; height:35px;",
                objects: [
                    {
                         type: "button",
                         text: "+",
                         onClick: () => loadMenu(previousMenu),
                         style: "position: absolute; top: -50px; font-size: 1.5em; right: -5px; color:gray; width: 10px; background-color: rgba(0,0,0,0);"
                    }
                ]
            },
            connecting: {
                style: "width:200px; height:58px",
                objects: [
                    {
                         type: "text",
                         text: "Connecting...",
                         style: "color:yellow; position: absolute; top:30px;"
                    },
                ]
            },
            error: {
                style: "width: 200px; height: 100px;",
                objects: [
                    {
                        type: "text",
                        text: "Error: " + lastError,
                        style: "color:red; position: absolute; top:25px;",
                    },
                    {
                        type: "button",
                        text: "To Menu",
                        style: "position: absolute; bottom:-8px; padding: 4px 4px;",
                        onClick: () => loadMenu("main"),
                    }
                ]
            },
            open: {
                style: "width:300px; height:200px",
                objects: [
                    {
                         type: "text",
                         text: "Connected",
                         style: "color:green; position: absolute; top:30px;"
                    },
                    {
                         type: "button",
                         text: "-",
                         onClick: () => loadMenu("minimized"),
                         style: "position: absolute; top: -50px; font-size: 1.5em; right: -5px; color:gray; width: 10px; background-color: rgba(0,0,0,0);"
                    },
                    {
                        type: "button",
                        text: "Disconnect",
                        style: "position: absolute; top: 165px; padding: 1px 5px; font-size: 0.85em;",
                        onClick: () => { disconnect(); loadMenu("main"); }
                    }
                ]
            },
        }
    })`;
}

function id(id) { return document.getElementById("ppjs_" + id); }

function applyObjects(overlay, objects) {
    for (const obj of objects) {
        let el;
        switch (obj.type) {
            case 'text': {
                el = document.createElement('div');
                el.textContent = obj.text;
                if (obj.style) el.style.cssText = obj.style;
                el.id = "ppjs_" + (obj.id ?? ("text" + (++texts)));
                break;
            }
            case 'button': {
                el = document.createElement('button');
                el.textContent = obj.text ?? "";
                if(obj.style) el.style.cssText = obj.style;
                el.onclick = typeof obj.onClick == 'function' ? obj.onClick : () => eval(`(${obj.onClick})();`);
                el.id = "ppjs_" + (obj.id ?? ("button" + (++buttons)));
                break;
            }
            case 'toggle': {
                const label = document.createElement('label');
                if(obj.labelStyle) label.style.cssText = obj.labelStyle;
                const input = document.createElement('input');
                if(obj.style) label.style.cssText = obj.style;
                input.type = 'checkbox';
                input.onchange = typeof obj.onClick == 'function' ? e => obj.onClick(e.target.checked) : e => eval(`(${obj.onClick})(${e.target.checked});`);
                label.appendChild(input);
                label.appendChild(document.createTextNode(' ' + obj.text));
                input.id = "ppjs_" + (obj.id ?? ("toggle" + (++toggles)));
                el = label;
                break;
            }
            case 'input': {
                const inp = document.createElement('input');
                inp.style.cssText = obj.style;
                inp.placeholder = obj.placeholder;
                inp.value = obj.defaultText;
                inp.id = "ppjs_" + (obj.id ?? ("input" + (++inputs)));
                if (obj.text) {
                    const text = document.createElement('div');
                    text.textContent = obj.text;
                    text.style.cssText = obj.textStyle;
                    text.appendChild(inp);
                    el = text;
                } else el = inp;
                break;
            }
        }
        overlay.appendChild(el);
    }
}

function loadMenu(tag) {
    const menu = menuData.menus[tag];
    if (!menu) throw new Error(`Not a menu: ${tag}`);

    texts = toggles = inputs = buttons = 0;

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'ppjs';
        document.body.appendChild(overlay);

        let isDragging = false, offsetX, offsetY;
        overlay.addEventListener('mousedown', e => {
            isDragging = true;
            offsetX = e.clientX - overlay.getBoundingClientRect().left;
            offsetY = e.clientY - overlay.getBoundingClientRect().top;
            overlay.style.cursor = 'move';
        });
        document.addEventListener('mousemove', e => {
            if (isDragging) {
                lastLeft = e.clientX - offsetX;
                lastTop = e.clientY - offsetY;
                overlay.style.left = lastLeft + 'px';
                overlay.style.top = lastTop + 'px';
                overlay.style.right = 'auto';
            }
        });
        document.addEventListener('mouseup', () => {
            isDragging = false;
            overlay.style.cursor = 'default';
        });
    }

    overlay.innerHTML = '';
    overlay.style.cssText = menuData.globalStyle + (menu.style ?? "");
    overlay.style.left = lastLeft + 'px';
    overlay.style.top = lastTop + 'px';
    overlay.style.right = 'auto';

    previousMenu = currentMenuTag;
    currentMenuTag = tag;

    applyObjects(overlay, menuData.globalObjects);
    applyObjects(overlay, menu.objects);

    currentMenu = overlay;
}

async function parseMenuJSON() {
    menuData = eval(await getMenuJSON());
    currentMenuTag = menuData.defaultMenu;
}

window.loadMenuData = (data) => {
    menuData = eval(data);
    currentMenuTag = menuData.defaultMenu;
    loadMenu(menuData.defaultMenu);
}

document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === 'q') {
        event.preventDefault();
        if(!overlay) loadMenu(menuData.defaultMenu);
        else overlay.remove();
    }
});

const lookup = {"255,255,255":0,"196,196,196":1,"166,166,166":60,"136,136,136":2,"111,111,111":61,"85,85,85":3,"58,58,58":62,"34,34,34":4,"0,0,0":5,"0,54,56":39,"0,102,0":6,"71,112,80":40,"27,116,0":49,"34,177,76":7,"2,190,1":8,"81,225,25":9,"148,224,68":10,"52,235,107":51,"152,251,152":41,"117,206,169":50,"202,255,112":58,"251,255,91":11,"229,217,0":12,"255,204,0":52,"193,161,98":57,"230,190,12":13,"229,149,0":14,"255,112,0":42,"255,57,4":21,"229,0,0":20,"206,41,57":43,"255,65,106":44,"159,0,0":19,"77,8,44":63,"107,0,0":18,"68,4,20":55,"255,117,95":23,"160,106,66":15,"99,60,31":17,"153,83,13":16,"187,79,0":22,"255,196,159":24,"255,223,204":25,"255,126,187":54,"255,167,209":26,"236,8,236":28,"187,39,108":53,"207,110,228":27,"125,38,205":45,"130,0,128":29,"89,28,145":56,"51,0,119":46,"2,7,99":31,"81,0,255":30,"0,0,234":32,"4,75,255":33,"1,49,130":59,"0,91,161":47,"101,131,207":34,"54,186,255":35,"0,131,199":36,"0,211,221":37,"69,255,200":38,"181,232,238":48,"204,204,204":-1};
const colors = {"0":[255,255,255],"1":[196,196,196],"2":[136,136,136],"3":[85,85,85],"4":[34,34,34],"5":[0,0,0],"6":[0,102,0],"7":[34,177,76],"8":[2,190,1],"9":[81,225,25],"10":[148,224,68],"11":[251,255,91],"12":[229,217,0],"13":[230,190,12],"14":[229,149,0],"15":[160,106,66],"16":[153,83,13],"17":[99,60,31],"18":[107,0,0],"19":[159,0,0],"20":[229,0,0],"21":[255,57,4],"22":[187,79,0],"23":[255,117,95],"24":[255,196,159],"25":[255,223,204],"26":[255,167,209],"27":[207,110,228],"28":[236,8,236],"29":[130,0,128],"30":[81,0,255],"31":[2,7,99],"32":[0,0,234],"33":[4,75,255],"34":[101,131,207],"35":[54,186,255],"36":[0,131,199],"37":[0,211,221],"38":[69,255,200],"39":[0,54,56],"40":[71,112,80],"41":[152,251,152],"42":[255,112,0],"43":[206,41,57],"44":[255,65,106],"45":[125,38,205],"46":[51,0,119],"47":[0,91,161],"48":[181,232,238],"49":[27,116,0],"50":[117,206,169],"51":[52,235,107],"52":[255,204,0],"53":[187,39,108],"54":[255,126,187],"55":[68,4,20],"56":[89,28,145],"57":[193,161,98],"58":[202,255,112],"59":[1,49,130],"60":[166,166,166],"61":[111,111,111],"62":[58,58,58],"63":[77,8,44],"-1":[204,204,204]};
// cuz of canvas bs
function getClosestColor(r,g,b) {
    const key = `${r},${g},${b}`;
    if(lookup[key]) return lookup[key];

    for(const [code, [or,og,ob]] of Object.entries(colors)) {
        const dr = Math.abs(or - r), dg = Math.abs(og - g), db = Math.abs(ob - b);
        if(dr < 2 && dg < 2 && db < 2) {
            lookup[key] = code;
            return code;
        }
    }
}


/** PPJS CONNECTION */
const SC = { CUSTOM:0,CODE:1,SETTINGS:2,SOCKET_SEND:3,MENU_DATA:4,MENU_CHANGE:5,ADD_TO_MENU:6, };
const CC = { CUSTOM:0,SOCKET_DATA:1,INFO:2,CANVAS_ONE:3,CANVAS_TWO:4,PACKET_REQUEST:5,REQUEST_CALLBACK:6, };

const handlers = {
    [SC.SETTINGS]: (packet) => {
        settings = JSON.parse(packet);
        if(settings.browserClient) {
            const canvasData = Array.from(window.canvas.getContext("2d").getImageData(0,0,window.canvas.width,window.canvas.height).data);
            const canvasCodes = [];
            for(let i=0;i<canvasData.length;i+=4) {
                const r = canvasData[i], g = canvasData[i+1], b = canvasData[i+2];
                const col = getClosestColor(r,g,b);
                canvasCodes[i/4] = String.fromCharCode(col);
            }
            emit(CC.CANVAS_ONE, canvasCodes.splice(0, 8388000).join("")); // ~8mb
            emit(CC.CANVAS_TWO, canvasCodes.join(""));
        }
    },
    [SC.CODE]: (packet) => { eval(packet); },
    [SC.SOCKET_SEND]: (packet) => {
        pxpSocket.superSend(packet);
    },
    [SC.MENU_DATA]: (packet) => {
        console.log("Menu data received:", packet);
        const newMD = eval(packet);
        menuData.menus = {...menuData.menus, ...newMD};
    },
    [SC.ADD_TO_MENU]: (packet) => {
        console.log("Current menu data received:", packet);
        const data = eval(`(${packet})`);
        menuData.menus[currentMenuTag].objects.push(data);
        loadMenu(currentMenuTag);
    },
    [SC.MENU_CHANGE]: (packet) => {
        console.log("Menu change received:", packet);
        loadMenu(packet);
    },
};

function emit(code, data, id = -1) {
    fireEvent({ type: "send-to-ws", data: String.fromCharCode(code) + data }, id);
}

function fireEvent(data, id, callback) {
    callbacks[id] = callback;
    window.dispatchEvent(new CustomEvent("from-userscript", { detail: { id, data } }));
}

window.addEventListener("extension", e => {
    const { id, response } = e.detail;
    const cb = callbacks[id];
    if (cb) {
        cb(response);
    }
});

function onMsg(data) {
    emit(CC.SOCKET_DATA, data);
}

function connect(port, menu) {
    if (isNaN(parseInt(port))) {
        alert("Port must be a number!");
        setTimeout(() => loadMenu(menu), 0);
        return;
    }

    fireEvent({ type: "connect-ws", port }, 1, (response) => {
        if (response?.error) {
            lastError = response.error;
            loadMenu(menuData.errorMenu);
            return;
        }
        loadMenu(menuData.openMenu);
        emit(CC.INFO, JSON.stringify({ boardID, userID, width, height, premium, username, template }));
    });
}
function disconnect() {
    settings = {};
    fireEvent({ type: "disconnect-ws" });
}

function requestCallback(uuid, val) {
    emit(CC.REQUEST_CALLBACK, JSON.stringify([uuid, val]));
}