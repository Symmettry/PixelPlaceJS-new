import { ipcRenderer } from 'electron';

function pretty(value: string) {
    return value
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

const styleCSS = `
:host {
    all: initial;
}

.ppjs-tab:disabled,
.ppjs-primary-btn:disabled,
.ppjs-secondary-btn:disabled,
.ppjs-upload-btn[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
}

.ppjs-pause-btn {
    background: #7f1d1d;
    color: #ffffff;
    border: 1px solid #b91c1c;
}

.ppjs-pause-btn.ppjs-paused {
    background: #14532d;
    color: #ffffff;
    border: 1px solid #22c55e;
}

.ppjs-cancel-btn {
    background: #3b0a0a;
    color: #ffffff;
    border: 1px solid #dc2626;
}

* {
    box-sizing: border-box;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ppjs-wrap {
    pointer-events: auto;
    width: 420px;
    color: #e7ebf3;
}

.ppjs-window {
    background: rgba(17, 20, 27, 0.96);
    border: 1px solid #232938;
    border-radius: 16px;
    overflow: visible;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(10px);
}

#ppjs-toggle {
    cursor: pointer;
}

.ppjs-titlebar {
    height: 48px;
    padding: 0 14px;
    border-bottom: 1px solid #202636;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #0f1218;
    border-radius: 16px 16px 0 0;
    cursor: move;
    user-select: none;
}

.ppjs-title-left {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #dbe2f1;
    font-weight: 600;
}

.ppjs-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: #63e6be;
    box-shadow: 0 0 12px rgba(99, 230, 190, 0.55);
}

.ppjs-tabs {
    display: flex;
    gap: 8px;
    padding: 12px 14px 0;
    background: #11141b;
}

.ppjs-tab {
    border: none;
    background: transparent;
    color: #93a0b8;
    padding: 10px 14px;
    border-radius: 10px 10px 0 0;
    cursor: pointer;
    font-weight: 600;
}

.ppjs-tab.ppjs-active {
    background: #171c27;
    color: #f4f7fb;
    border: 1px solid #283042;
    border-bottom: none;
}

.ppjs-panel {
    padding: 14px;
    background: #171c27;
    border-top: 1px solid #283042;
    border-radius: 0 0 16px 16px;
}

.ppjs-card {
    background: #11151e;
    border: 1px solid #252d3d;
    border-radius: 14px;
    padding: 16px;
}

.ppjs-header h2 {
    margin: 0 0 4px;
    font-size: 18px;
}

.ppjs-header p {
    margin: 0 0 16px;
    color: #95a1b8;
    font-size: 13px;
}

.ppjs-stack {
    display: grid;
    gap: 14px;
}

.ppjs-field {
    display: grid;
    gap: 8px;
    position: relative;
}

.ppjs-row-two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.ppjs-label {
    font-size: 13px;
    color: #b5bfd1;
    font-weight: 600;
}

.ppjs-input,
.ppjs-select,
.ppjs-dropdown-btn {
    width: 100%;
    height: 42px;
    border: 1px solid #2b3446;
    background: #0c1017;
    color: #eef2f8;
    border-radius: 10px;
    padding: 0 12px;
    outline: none;
}

.ppjs-upload-btn {
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 14px;
    border-radius: 10px;
    background: #1d2432;
    border: 1px solid #313b4f;
    color: #f1f5fb;
    cursor: pointer;
    font-weight: 600;
}

.ppjs-file-name {
    font-size: 12px;
    color: #92a0b7;
}

.ppjs-dropdown {
    position: relative;
}

.ppjs-dropdown-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    text-align: left;
}

.ppjs-dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    width: 100%;
    max-height: 240px;
    overflow-y: auto;
    background: #10151f;
    border: 1px solid #2e384d;
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.38);
    z-index: 50;
    display: none;
}

.ppjs-dropdown.ppjs-open .ppjs-dropdown-menu {
    display: block;
}

.ppjs-dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 10px;
    border-radius: 8px;
    color: #dce4f2;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
}

.ppjs-dropdown-item:hover {
    background: #1a2130;
}

.ppjs-selected-configs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 10px;
    padding-top: 4px;
}

.ppjs-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #1e2635;
    border: 1px solid #33405a;
    color: #e6edf8;
    border-radius: 999px;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 600;
}

.ppjs-chip button {
    border: none;
    background: transparent;
    color: #9fb0cb;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0;
}

.ppjs-actions {
    display: flex;
    gap: 10px;
    padding-top: 4px;
}

.ppjs-primary-btn,
.ppjs-secondary-btn {
    height: 42px;
    border-radius: 10px;
    padding: 0 16px;
    border: none;
    cursor: pointer;
    font-weight: 700;
}

.ppjs-primary-btn {
    background: #5b8cff;
    color: white;
}

.ppjs-secondary-btn {
    background: #202838;
    color: #dce4f3;
    border: 1px solid #313b4f;
}

.ppjs-preview-card {
    margin-top: 14px;
    background: #11151e;
    border: 1px solid #252d3d;
    border-radius: 14px;
    padding: 16px;
}

.ppjs-preview-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    color: #dce4f2;
    font-weight: 600;
}

.ppjs-preview-meta {
    font-size: 12px;
    color: #95a2b9;
}

.ppjs-preview-box {
    min-height: 240px;
    border-radius: 12px;
    border: 1px dashed #33405a;
    background: #0c1017;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: #7f8ca3;
    padding: 16px;
}

.ppjs-canvas {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    background: #000;
    border: 1px solid #33405a;
    display: block;
}
.flag-row {
    display: flex;
    flex-direction: row;
    gap: 12px;        /* spacing between them */
    align-items: center;
}
`;
const wrapHTML = `
<div class="ppjs-window">
    <div class="ppjs-titlebar">
        <div class="ppjs-title-left">
            <div class="ppjs-dot"></div>
            <span>PixelPlace Bot</span>
        </div>
        <button id="ppjs-toggle" class="ppjs-secondary-btn" style="height:32px;padding:0 10px;">Hide</button>
    </div>

    <div id="ppjs-body">
        <div class="ppjs-tabs">
            <button class="ppjs-tab ppjs-active" data-tab="images">Images</button>
            <button class="ppjs-tab" data-tab="active">Active</button>
        </div>

        <div class="ppjs-panel" data-panel="images">
            <div class="ppjs-card">
                <div class="ppjs-header">
                    <h2>Image Draw</h2>
                    <p>Upload an image and configure draw behavior.</p>
                </div>

                <div class="ppjs-stack">
                    <div class="ppjs-field">
                        <div class="ppjs-label">Image</div>
                        <label for="ppjs-image-upload" class="ppjs-upload-btn">Upload Image</label>
                        <input id="ppjs-image-upload" type="file" accept="image/*" hidden />
                        <div class="ppjs-file-name" id="ppjs-file-name">No file selected</div>
                    </div>

                    <div class="ppjs-row-two">
                        <div class="ppjs-field">
                            <label class="ppjs-label" for="ppjs-width">Width</label>
                            <input id="ppjs-width" class="ppjs-input" type="number" min="1" value="100" />
                        </div>

                        <div class="ppjs-field">
                            <label class="ppjs-label" for="ppjs-height">Height</label>
                            <input id="ppjs-height" class="ppjs-input" type="number" min="1" value="100" />
                        </div>
                    </div>

                    <div class="ppjs-row-two">
                        <div class="ppjs-field">
                            <label class="ppjs-label" for="ppjs-x">X Position</label>
                            <input id="ppjs-x" class="ppjs-input" type="number" min="0" max="3000" value="0" />
                        </div>

                        <div class="ppjs-field">
                            <label class="ppjs-label" for="ppjs-y">Y Position</label>
                            <input id="ppjs-y" class="ppjs-input" type="number" min="0" max="3000" value="0" />
                        </div>
                    </div>

                    <div class="ppjs-field">
                        <label class="ppjs-label" for="ppjs-mode">Mode</label>
                        <select id="ppjs-mode" class="ppjs-select">
                            <option value="ROWS">Rows</option>
                            <option value="COLUMNS">Columns</option>
                            <option value="DIAGONAL_TL">Diagonal TL</option>
                            <option value="DIAGONAL_TR">Diagonal TR</option>
                            <option value="RANDOM">Random</option>
                            <option value="SQUARE_SPIRAL">Square Spiral</option>
                            <option value="CIRCLE_SPIRAL">Circle Spiral</option>
                            <option value="SQUARE_RINGS">Square Rings</option>
                            <option value="HILBERT">Hilbert</option>
                            <option value="HAMILTONIAN_SNAKE">Hamiltonian Snake</option>
                        </select>
                    </div>

                    <div class="ppjs-field">
                        <div class="ppjs-label">Mode Configs</div>
                        <div class="ppjs-dropdown" id="ppjs-dropdown">
                            <button type="button" class="ppjs-dropdown-btn" id="ppjs-dropdown-btn">
                                <span id="ppjs-dropdown-text">Select mode configs</span>
                                <span>▾</span>
                            </button>

                            <div class="ppjs-dropdown-menu" id="ppjs-dropdown-menu">
                                ${[
                                    'REVERSE','ROTATE','CHECKERED','SNAKE','ANGLE_CW','ANGLE_CCW',
                                    'CENTRAL_SORT','DIAMOND_SORT','REVERSE_ROWS',
                                    'SHUFFLE_ROWS','SHUFFLE_COLUMNS','MIRROR','SORT_BY_COLOR'
                                ].map(v => `
                                    <label class="ppjs-dropdown-item">
                                        <input type="checkbox" value="${v}" />
                                        <span>${pretty(v)}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <div class="ppjs-selected-configs" id="ppjs-selected-configs"></div>
                    </div>
                    <div class="flag-row">
                        <label>
                            <input type="checkbox" id="ppjs-protect">
                            Protect
                        </label>

                        <label>
                            <input type="checkbox" id="ppjs-force">
                            Force
                        </label>
                    </div>

                    <div class="ppjs-actions">
                        <button class="ppjs-secondary-btn" id="ppjs-preview-btn">Preview</button>
                        <button class="ppjs-secondary-btn" id="ppjs-select-btn">Select Location</button>
                        <button class="ppjs-primary-btn" id="ppjs-draw-btn">Draw</button>
                    </div>
                </div>
            </div>

            <div class="ppjs-preview-card">
                <div class="ppjs-preview-header">
                    <span>Preview</span>
                    <span class="ppjs-preview-meta" id="ppjs-preview-meta">64 × 64 • Rows</span>
                </div>
                <div class="ppjs-preview-box" id="ppjs-preview-box">
                    <span>No image loaded</span>
                </div>
            </div>
        </div>

        <div class="ppjs-panel" data-panel="active" style="display:none;">
            <div class="ppjs-card">
                <div class="ppjs-header">
                    <h2>Active Draw</h2>
                    <p>Shows the current thing being drawn.</p>
                </div>

                <div class="ppjs-stack" id="ppjs-active-content">
                    <div class="ppjs-field">
                        <div class="ppjs-label">Status</div>
                        <div class="ppjs-input" id="ppjs-active-status" style="display:flex;align-items:center;">Idle</div>
                    </div>

                    <div class="ppjs-row-two">
                        <div class="ppjs-field">
                            <div class="ppjs-label">Position</div>
                            <div class="ppjs-input" id="ppjs-active-position" style="display:flex;align-items:center;">-</div>
                        </div>
                        <div class="ppjs-field">
                            <div class="ppjs-label">Size</div>
                            <div class="ppjs-input" id="ppjs-active-size" style="display:flex;align-items:center;">-</div>
                        </div>
                    </div>

                    <div class="ppjs-field">
                        <div class="ppjs-label">Mode</div>
                        <div class="ppjs-input" id="ppjs-active-mode" style="display:flex;align-items:center;">-</div>
                    </div>

                    <div class="ppjs-field">
                        <div class="ppjs-label">Configs</div>
                        <div class="ppjs-selected-configs" id="ppjs-active-configs"></div>
                    </div>

                    <div class="ppjs-field">
                        <div class="ppjs-label">Image</div>
                        <div class="ppjs-file-name" id="ppjs-active-image">No active image</div>
                    </div>
                    
                    <div class="ppjs-actions">
                        <button class="ppjs-secondary-btn ppjs-pause-btn" id="ppjs-pause-btn">Pause</button>
                        <button class="ppjs-secondary-btn ppjs-cancel-btn" id="ppjs-cancel-btn">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
`;

window.addEventListener('DOMContentLoaded', () => {
    injectOverlay();
    ipcRenderer.send('page-info', [
        'init',
        {
            boardID: Number(location.pathname.substring(1).split("-")[0]),
            cookies: Object.fromEntries(document.cookie.split(";").map(k => k.trim().split("="))),
        }
    ]);
});
window.addEventListener('beforeunload', () => {
    ipcRenderer.send('page-info', [
        'close',
    ]);
});

ipcRenderer.on('server-message', (_event, data) => {
    const [key, value] = data;

    switch (key) {
        case 'sorted': {
            const handler = (window as any).__ppjsHandleSortedPreview;
            handler?.(value);
            break;
        }
        case 'draw_finished': {
            const clear = (window as any).__ppjsClearActiveDrawUi;
            clear?.();
            break;
        }
        case 'close': {
            window.location.reload();
            break;
        }
        default: {
            console.log('<UNIMPLEMENTED>', key, value);
            break;
        }
    }
});

function injectOverlay() {
    if (document.getElementById('ppjs-root-host')) return;

    const host = document.createElement('div');
    host.id = 'ppjs-root-host';
    host.style.position = 'fixed';
    host.style.top = '16px';
    host.style.left = `${window.innerWidth - 16 - 420}px`;
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'none';
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = styleCSS;

    const wrap = document.createElement('div');
    wrap.className = 'ppjs-wrap';

    wrap.innerHTML = wrapHTML;

    shadow.appendChild(style);
    shadow.appendChild(wrap);

    setupOverlay(shadow);
}

function setupOverlay(root: ShadowRoot) {

    const tabs = Array.from(root.querySelectorAll('.ppjs-tab')) as HTMLButtonElement[];
    const panels = Array.from(root.querySelectorAll('.ppjs-panel[data-panel]')) as HTMLDivElement[];

    const imagesTab = root.querySelector('.ppjs-tab[data-tab="images"]') as HTMLButtonElement;
    const activeTabBtn = root.querySelector('.ppjs-tab[data-tab="active"]') as HTMLButtonElement;

    const activeStatus = root.getElementById('ppjs-active-status') as HTMLDivElement;
    const activePosition = root.getElementById('ppjs-active-position') as HTMLDivElement;
    const activeSize = root.getElementById('ppjs-active-size') as HTMLDivElement;
    const activeMode = root.getElementById('ppjs-active-mode') as HTMLDivElement;
    const activeConfigs = root.getElementById('ppjs-active-configs') as HTMLDivElement;
    const activeImage = root.getElementById('ppjs-active-image') as HTMLDivElement;

    const imageUpload = root.getElementById('ppjs-image-upload') as HTMLInputElement;
    const fileName = root.getElementById('ppjs-file-name') as HTMLDivElement;
    const previewBox = root.getElementById('ppjs-preview-box') as HTMLDivElement;
    const previewMeta = root.getElementById('ppjs-preview-meta') as HTMLSpanElement;
    const widthInput = root.getElementById('ppjs-width') as HTMLInputElement;
    const heightInput = root.getElementById('ppjs-height') as HTMLInputElement;
    const xInput = root.getElementById('ppjs-x') as HTMLInputElement;
    const yInput = root.getElementById('ppjs-y') as HTMLInputElement;
    const modeSelect = root.getElementById('ppjs-mode') as HTMLSelectElement;
    const dropdown = root.getElementById('ppjs-dropdown') as HTMLDivElement;
    const dropdownBtn = root.getElementById('ppjs-dropdown-btn') as HTMLButtonElement;
    const dropdownText = root.getElementById('ppjs-dropdown-text') as HTMLSpanElement;
    const selectedConfigs = root.getElementById('ppjs-selected-configs') as HTMLDivElement;
    const previewBtn = root.getElementById('ppjs-preview-btn') as HTMLButtonElement;
    const selectBtn = root.getElementById('ppjs-select-btn') as HTMLButtonElement;
    const drawBtn = root.getElementById('ppjs-draw-btn') as HTMLButtonElement;
    const toggleBtn = root.getElementById('ppjs-toggle') as HTMLButtonElement;
    const body = root.getElementById('ppjs-body') as HTMLDivElement;
    const configCheckboxes = Array.from(root.querySelectorAll('#ppjs-dropdown-menu input[type="checkbox"]')) as HTMLInputElement[];
    const host = document.getElementById('ppjs-root-host') as HTMLDivElement;
    const titlebar = root.querySelector('.ppjs-titlebar') as HTMLDivElement;
    const pauseBtn = root.getElementById('ppjs-pause-btn') as HTMLButtonElement;
    const cancelBtn = root.getElementById('ppjs-cancel-btn') as HTMLButtonElement;
    const protect = root.getElementById('ppjs-protect') as HTMLInputElement;
    const force = root.getElementById('ppjs-force') as HTMLInputElement;

    let objectUrl = '';
    let selectedFile: File | null = null;
    let originalImage: HTMLImageElement | null = null;
    let previewCanvas: HTMLCanvasElement | null = null;

    let dragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    let activeTab: string = 'images';

    let isPaused = false;

    let currentDrawState: {
        status: string;
        x: number;
        y: number;
        width: number;
        height: number;
        mode: string;
        configs: string[];
        fileName: string | null;
    } | null = null;

    let previewPixels: Uint8ClampedArray | null = null;
    let previewBaseCanvas: HTMLCanvasElement | null = null;
    let previewAnimationFrame: number | null = null;
    let previewRequestId = 0;

    function setActiveTab(tabName: string) {
        activeTab = tabName;

        tabs.forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('ppjs-active', isActive);
        });

        panels.forEach(panel => {
            panel.style.display = panel.dataset.panel === tabName ? '' : 'none';
        });
    }
    function hasActiveDraw() {
        return currentDrawState !== null && currentDrawState.status !== 'Cancelled';
    }

    function updateTabLocks() {
        const drawingActive = hasActiveDraw();

        imagesTab.disabled = drawingActive;
        activeTabBtn.disabled = false;

        if (drawingActive && activeTab !== 'active') {
            setActiveTab('active');
        }
    }


    function clearActiveDrawUi() {
        currentDrawState = null;
        isPaused = false;
        updatePauseButton();
        updateActivePanel();
        updateTabLocks();
        setActiveTab('images');
    }
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            if (!tabName) return;

            if (hasActiveDraw()) return;

            setActiveTab(tabName);
        });
    });

    function renderActiveConfigs(configs: string[]) {
        activeConfigs.innerHTML = '';

        if (!configs.length) {
            activeConfigs.innerHTML = `<div class="ppjs-file-name">No configs selected</div>`;
            return;
        }

        for (const value of configs) {
            const chip = document.createElement('div');
            chip.className = 'ppjs-chip';
            chip.innerHTML = `<span>${pretty(value)}</span>`;
            activeConfigs.appendChild(chip);
        }
    }

    function updateControlButtons() {
        const active = hasActiveDraw();
        pauseBtn.disabled = !active;
        cancelBtn.disabled = !active;
    }

    function updatePauseButton() {
        pauseBtn.textContent = isPaused ? 'Start' : 'Pause';
        pauseBtn.classList.toggle('ppjs-paused', isPaused);
    }

    function setDrawStatus(status: string) {
        if (!currentDrawState) return;
        currentDrawState.status = status;
        updateActivePanel();
    }

    function updateActivePanel() {
        if (!currentDrawState) {
            activeStatus.textContent = 'Idle';
            activePosition.textContent = '-';
            activeSize.textContent = '-';
            activeMode.textContent = '-';
            activeImage.textContent = 'No active image';
            activeConfigs.innerHTML = `<div class="ppjs-file-name">No configs selected</div>`;
            updateControlButtons();
            updateTabLocks();
            return;
        }

        activeStatus.textContent = currentDrawState.status;
        activePosition.textContent = `${currentDrawState.x}, ${currentDrawState.y}`;
        activeSize.textContent = `${currentDrawState.width} × ${currentDrawState.height}`;
        activeMode.textContent = pretty(currentDrawState.mode);
        activeImage.textContent = currentDrawState.fileName ?? 'No active image';
        renderActiveConfigs(currentDrawState.configs);
        updateControlButtons();
        updateTabLocks();
    }

    function clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
    }

    pauseBtn.addEventListener('click', () => {
        if (!currentDrawState) return;

        isPaused = !isPaused;
        updatePauseButton();
        setDrawStatus(isPaused ? 'Paused' : 'Drawing');

        ipcRenderer.send('page-info', [
            isPaused ? 'pause' : 'start',
        ]);
    });

    cancelBtn.addEventListener('click', () => {
        if (!currentDrawState) return;

        ipcRenderer.send('page-info', [
            'cancel',
        ]);

        clearActiveDrawUi();
    });

    titlebar.addEventListener('mousedown', (e: MouseEvent) => {
        const target = e.target as HTMLElement;

        if (target.closest('button, input, select, label')) return;

        dragging = true;

        const rect = host.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;

        document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
        if (!dragging) return;

        const rect = host.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width;
        const maxTop = window.innerHeight - rect.height;

        const nextLeft = clamp(e.clientX - dragOffsetX, 0, Math.max(0, maxLeft));
        const nextTop = clamp(e.clientY - dragOffsetY, 0, Math.max(0, maxTop));

        host.style.left = `${nextLeft}px`;
        host.style.top = `${nextTop}px`;
        host.style.right = 'auto';
    });

    window.addEventListener('mouseup', () => {
        dragging = false;
        document.body.style.userSelect = '';
    });

    function clampDimension(value: string) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 1;
        return Math.max(1, Math.floor(n));
    }

    let configSelectionOrder: string[] = [];
    function getSelectedConfigs() {
        return [...configSelectionOrder];
    }

    function updateDropdownText() {
        const selected = getSelectedConfigs();
        if (selected.length === 0) {
            dropdownText.textContent = 'Select mode configs';
        } else if (selected.length === 1) {
            dropdownText.textContent = pretty(selected[0]);
        } else {
            dropdownText.textContent = `${selected.length} configs selected`;
        }
    }

    function renderChips() {
        const selected = getSelectedConfigs();
        selectedConfigs.innerHTML = '';

        for (const value of selected) {
            const chip = document.createElement('div');
            chip.className = 'ppjs-chip';
            chip.innerHTML = `<span>${pretty(value)}</span>`;

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.textContent = '×';
            remove.addEventListener('click', () => {
                const checkbox = configCheckboxes.find(input => input.value === value);
                if (checkbox) checkbox.checked = false;
                syncConfigUi();
            });

            chip.appendChild(remove);
            selectedConfigs.appendChild(chip);
        }
    }

    function updateMeta() {
        const width = clampDimension(widthInput.value);
        const height = clampDimension(heightInput.value);
        const mode = modeSelect.options[modeSelect.selectedIndex]?.text || 'Rows';
        const configs = getSelectedConfigs();
        let text = `${width} × ${height} • ${mode}`;
        if (configs.length) text += ` • ${configs.length} config${configs.length > 1 ? 's' : ''}`;
        previewMeta.textContent = text;
    }

    function syncConfigUi() {
        updateDropdownText();
        renderChips();
        updateMeta();
    }

    function clearPreview(message = 'No image loaded') {
        previewBox.innerHTML = `<span>${message}</span>`;
        previewCanvas = null;
    }

    function scaleCanvasToFit() {
        if (!previewCanvas) return;

        const boxWidth = Math.max(1, previewBox.clientWidth - 32);
        const boxHeight = Math.max(1, previewBox.clientHeight - 32);

        const scale = Math.max(
            1,
            Math.min(boxWidth / previewCanvas.width, boxHeight / previewCanvas.height)
        );

        previewCanvas.style.width = `${Math.max(1, Math.floor(previewCanvas.width * scale))}px`;
        previewCanvas.style.height = `${Math.max(1, Math.floor(previewCanvas.height * scale))}px`;
    }

    function renderPreviewCanvas() {
        if (!originalImage) {
            clearPreview();
            return;
        }

        const width = clampDimension(widthInput.value);
        const height = clampDimension(heightInput.value);

        previewBox.innerHTML = '';

        const canvas = document.createElement('canvas');
        canvas.className = 'ppjs-canvas';
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(originalImage, 0, 0, width, height);

        previewCanvas = canvas;
        previewBox.appendChild(canvas);
        scaleCanvasToFit();
        updateMeta();
    }

    function stopPreviewAnimation() {
        if (previewAnimationFrame !== null) {
            cancelAnimationFrame(previewAnimationFrame);
            previewAnimationFrame = null;
        }
    }

    function buildBasePreviewData(width: number, height: number): Uint8ClampedArray | null {
        if (!originalImage) return null;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(originalImage, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        previewBaseCanvas = canvas;
        return imageData.data;
    }

    function renderSortedPreview(coords: [number, number][]) {
        if (!originalImage) {
            clearPreview();
            return;
        }

        const width = clampDimension(widthInput.value);
        const height = clampDimension(heightInput.value);

        const sourcePixels = buildBasePreviewData(width, height)!;
        if (!sourcePixels) {
            clearPreview('Failed to build preview');
            return;
        }

        stopPreviewAnimation();
        previewRequestId += 1;
        const requestId = previewRequestId;

        previewBox.innerHTML = '';

        const canvas = document.createElement('canvas');
        canvas.className = 'ppjs-canvas';
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d')!;
        if (!ctx) return;

        ctx.imageSmoothingEnabled = false;

        const output = new Uint8ClampedArray(width * height * 4);
        const imageData = new ImageData(output, width, height);

        previewCanvas = canvas;
        previewBox.appendChild(canvas);
        scaleCanvasToFit();

        const durationMs = 5000;
        const totalSteps = Math.max(1, coords.length);

        function copyPixel(x: number, y: number) {
            if (x < 0 || y < 0 || x >= width || y >= height) return;

            const idx = (y * width + x) * 4;
            output[idx] = sourcePixels[idx];
            output[idx + 1] = sourcePixels[idx + 1];
            output[idx + 2] = sourcePixels[idx + 2];
            output[idx + 3] = sourcePixels[idx + 3];
        }

        let drawnCount = 0;
        const start = performance.now();

        function frame(now: number) {
            if (requestId !== previewRequestId) return;

            const elapsed = now - start;
            const progress = Math.min(1, elapsed / durationMs);
            const targetCount = Math.floor(progress * totalSteps);

            while (drawnCount < targetCount) {
                const coord = coords[drawnCount];
                if (coord) {
                    const [x, y] = coord;
                    copyPixel(x, y);
                }
                drawnCount += 1;
            }

            ctx.putImageData(imageData, 0, 0);

            if (progress < 1) {
                previewAnimationFrame = requestAnimationFrame(frame);
            } else {
                while (drawnCount < totalSteps) {
                    const coord = coords[drawnCount];
                    if (coord) {
                        const [x, y] = coord;
                        copyPixel(x, y);
                    }
                    drawnCount += 1;
                }
                ctx.putImageData(imageData, 0, 0);
                previewAnimationFrame = null;
            }
        }

        previewAnimationFrame = requestAnimationFrame(frame);
    }

    dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('ppjs-open');
    });

    root.addEventListener('click', (e) => {
        const path = e.composedPath();
        if (!path.includes(dropdown)) {
            dropdown.classList.remove('ppjs-open');
        }
    });

    configCheckboxes.forEach(input => {
        input.addEventListener('change', () => {
            if (input.checked) {
                if (!configSelectionOrder.includes(input.value)) {
                    configSelectionOrder.push(input.value);
                }
            } else {
                configSelectionOrder = configSelectionOrder.filter(value => value !== input.value);
            }

            syncConfigUi();
        });
    });

    imageUpload.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        selectedFile = file;
        fileName.textContent = file.name;

        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(file);

        const img = new Image();
        img.onload = () => {
            originalImage = img;
            renderPreviewCanvas();
        };
        img.onerror = () => {
            selectedFile = null;
            originalImage = null;
            clearPreview('Failed to load image');
        };
        img.src = objectUrl;
    });

    widthInput.addEventListener('input', renderPreviewCanvas);
    heightInput.addEventListener('input', renderPreviewCanvas);
    modeSelect.addEventListener('change', updateMeta);

    previewBtn.addEventListener('click', async () => {
        let imageData: string | null = null;

        if (selectedFile) {
            const arrayBuffer = await selectedFile.arrayBuffer();
            imageData = Buffer.from(arrayBuffer).toString('base64');
        }

        const payload = {
            width: clampDimension(widthInput.value),
            height: clampDimension(heightInput.value),
            mode: modeSelect.value,
            modeConfigs: getSelectedConfigs(),
            hasImage: !!selectedFile,
            imageData,
        };

        if (!payload.hasImage || !payload.imageData) {
            clearPreview('No image loaded');
            return;
        }

        stopPreviewAnimation();
        clearPreview('Sorting preview...');

        const modeLabel = modeSelect.options[modeSelect.selectedIndex]?.text || 'Rows';
        const configs = payload.modeConfigs;
        let metaText = `${payload.width} × ${payload.height} • ${modeLabel}`;
        if (configs.length) metaText += ` • ${configs.length} config${configs.length > 1 ? 's' : ''}`;
        metaText += ' • Previewing';
        previewMeta.textContent = metaText;

        ipcRenderer.send('page-info', [
            'sort',
            payload,
        ]);
    });

    let selecting = false;
    function updateSelecting() {
        const cursor = document.getElementById('cursor');
        if (!cursor) return;

        const existing = cursor.querySelector('#ppjs-info');
        existing?.remove();

        if (selecting) {
            const ele = document.createElement('div');
            ele.id = 'ppjs-info';
            ele.innerText = 'Selecting Location';
            cursor.appendChild(ele);
        }
    }
    selectBtn.addEventListener('click', () => {
        selecting = !selecting;
        updateSelecting();
    })

    drawBtn.addEventListener('click', async () => {
        let imageData: string | null = null;

        if (selectedFile) {
            const arrayBuffer = await selectedFile.arrayBuffer();
            imageData = Buffer.from(arrayBuffer).toString('base64');
        }

        const payload = {
            x: Number(xInput.value),
            y: Number(yInput.value),
            width: clampDimension(widthInput.value),
            height: clampDimension(heightInput.value),
            mode: modeSelect.value,
            modeConfigs: getSelectedConfigs(),
            hasImage: !!selectedFile,
            protect: protect.value,
            force: force.value,
            imageData,
        };

        currentDrawState = {
            status: 'Drawing',
            x: payload.x,
            y: payload.y,
            width: payload.width,
            height: payload.height,
            mode: payload.mode,
            configs: payload.modeConfigs,
            fileName: selectedFile?.name ?? null,
        };

        isPaused = false;
        updatePauseButton();
        updateActivePanel();
        updateTabLocks();
        setActiveTab('active');

        ipcRenderer.send('page-info', [
            'draw',
            payload,
        ]);
    });

    toggleBtn.addEventListener('click', () => {
        const hidden = body.style.display === 'none';
        body.style.display = hidden ? '' : 'none';
        toggleBtn.textContent = hidden ? 'Hide' : 'Show';
    });

    window.addEventListener('resize', () => {
        scaleCanvasToFit();

        const rect = host.getBoundingClientRect();
        const maxLeft = Math.max(0, window.innerWidth - rect.width);
        const maxTop = Math.max(0, window.innerHeight - rect.height);

        host.style.left = `${clamp(rect.left, 0, maxLeft)}px`;
        host.style.top = `${clamp(rect.top, 0, maxTop)}px`;
        host.style.right = 'auto';
    });

    syncConfigUi();
    updateMeta();
    clearPreview();
    updatePauseButton();
    updateActivePanel();
    updateTabLocks();
    setActiveTab('images');

    function waitForObj(propName: string, { root = window }: { root: any } = { root: window }): Promise<any> {
        return new Promise((resolve, reject) => {
            if (root[propName] !== undefined) {
                return resolve(root[propName]);
            }

            let value: any;

            try {
                Object.defineProperty(root, propName, {
                    configurable: true,
                    enumerable: true,
                    set(v) {
                        value = v;

                        delete root[propName];
                        root[propName] = v;

                        resolve(v);
                    },
                    get() {
                        return value;
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    waitForObj('painting').then((painting: HTMLDivElement) => {
        painting.addEventListener('click', (e) => {
            if(selecting) {
                selecting = false;
                updateSelecting();
                e.stopPropagation();
                const [x,y] = document.getElementById('coordinates')?.innerText.split(',')!;
                xInput.value = x;
                yInput.value = y;
            }
        });
    });

    (window as any).__ppjsHandleSortedPreview = (coords: [number, number][]) => {
        if (!Array.isArray(coords)) return;
        renderSortedPreview(coords);
    };
    (window as any).__ppjsClearActiveDrawUi = clearActiveDrawUi;
}