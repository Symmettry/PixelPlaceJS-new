// ==UserScript==
// @name         PPJS Userscript Hook
// @version      v1.0
// @description  Hooks PPJS to a userscript
// @author       Symmettry/lilyorb
// @match        https://pixelplace.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pixelplace.io
// @grant        none
// ==/UserScript==

/** WEBSOCKET HOOK */
let socket;
window.WebSocket = class WSH extends window.WebSocket {
    constructor(url, params) {
        super(url, params);
        window.socket = socket = this;
    }
};

/** DISPLAY */
let currentMenu, menuData;
let overlay; // the draggable container

async function getMenuJSON() {
    return `({
        defaultMenu: "main",
        globalStyle: "z-index:9999; border-radius:8px; box-shadow:0 0 10px rgba(0,0,0,0.5); user-select:none; color:#fff; background-color:rgba(0,0,0,0.8); padding:10px;",
        menus: {
            main: {
                style: "position:fixed; top:20px; right:20px; width:200px;",
                objects: [
                    { type: "text", text: "PixelPlaceJS", style: "font-weight:bold; margin-bottom:10px;" },
                    { type: "text", text: "Not Connected", style: "text-color:red;" }
                ]
            }
        }
    })`;
}

function loadMenu(tag) {
    const menu = menuData.menus[tag];
    if (!menu) throw new Error(`Not a menu: ${tag}`);

    if (!overlay) {
        overlay = document.createElement('div');
        document.body.appendChild(overlay);

        // Make draggable
        let isDragging = false, offsetX, offsetY;
        overlay.addEventListener('mousedown', e => {
            isDragging = true;
            offsetX = e.clientX - overlay.getBoundingClientRect().left;
            offsetY = e.clientY - overlay.getBoundingClientRect().top;
            overlay.style.cursor = 'move';
        });
        document.addEventListener('mousemove', e => {
            if (isDragging) {
                overlay.style.left = `${e.clientX - offsetX}px`;
                overlay.style.top = `${e.clientY - offsetY}px`;
                overlay.style.right = 'auto';
            }
        });
        document.addEventListener('mouseup', () => {
            isDragging = false;
            overlay.style.cursor = 'default';
        });
    }

    overlay.innerHTML = ''; // clear previous menu
    overlay.style.cssText = menuData.globalStyle + menu.style;

    for (const obj of menu.objects) {
        console.log(obj);
        let el;
        switch (obj.type) {
            case 'text': {
                el = document.createElement('div');
                el.textContent = obj.text;
                if (obj.style) el.style.cssText = obj.style;
                break;
            }
            case 'button': {
                el = document.createElement('button');
                el.textContent = obj.text;
                el.style.width = '100%';
                el.style.marginBottom = '5px';
                el.onclick = obj.onClick;
                break;
            }
            case 'toggle': {
                const label = document.createElement('label');
                label.style.display = 'block';
                label.style.marginTop = '5px';
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.onchange = e => obj.onChange(e.target.checked);
                label.appendChild(input);
                label.appendChild(document.createTextNode(' ' + obj.text));
                el = label;
                break;
            }
        }
        overlay.appendChild(el);
    }

    currentMenu = overlay;
}

async function parseMenuJSON() {
    menuData = eval(await getMenuJSON());
    loadMenu(menuData.defaultMenu);
}

parseMenuJSON();
