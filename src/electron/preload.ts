import { ipcRenderer } from 'electron';

const pretty = (v: string) => v.toLowerCase().split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

const { styleCSS, wrapHTML } = ipcRenderer.sendSync('ppjs:get-ui-assets-sync');

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

const handlers = {
  sorted: (v: any) => (window as any).__ppjsHandleSortedPreview?.(v),
  draw_finished: () => (window as any).__ppjsClearActiveDrawUi?.(),
  close: () => location.reload(),
} satisfies Record<string, (...args: any[]) => any>;

ipcRenderer.on('server-message', (_e, [k, v]: [keyof typeof handlers, any]) =>
  handlers[k]?.(v) ?? console.log('<UNIMPLEMENTED>', k, v)
);

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

    const $ = (id: string) => root.getElementById(id);
    const $DIV = (...id: string[]) => id.map(k => root.getElementById('ppjs-' + k)) as HTMLDivElement[];

    const tabs = Array.from(root.querySelectorAll('.ppjs-tab')) as HTMLButtonElement[];
    const panels = Array.from(root.querySelectorAll('.ppjs-panel[data-panel]')) as HTMLDivElement[];

    const imagesTab = root.querySelector('.ppjs-tab[data-tab="images"]') as HTMLButtonElement;
    const activeTabBtn = root.querySelector('.ppjs-tab[data-tab="active"]') as HTMLButtonElement;

    const [activeStatus, activePosition, activeSize, activeMode, activeConfigs, activeImage, body, selectedConfigs, dropdown]
        = $DIV('active-status', 'active-position', 'active-size', 'active-mode', 'active-configs', 'active-image', 'body', 'selected-configs', 'dropdown');

    const imageUpload = $('ppjs-image-upload') as HTMLInputElement;
    const fileName = $('ppjs-file-name') as HTMLDivElement;
    const previewBox = $('ppjs-preview-box') as HTMLDivElement;
    const previewMeta = $('ppjs-preview-meta') as HTMLSpanElement;
    const widthInput = $('ppjs-width') as HTMLInputElement;
    const heightInput = $('ppjs-height') as HTMLInputElement;
    const xInput = $('ppjs-x') as HTMLInputElement;
    const yInput = $('ppjs-y') as HTMLInputElement;
    const modeSelect = $('ppjs-mode') as HTMLSelectElement;
    const dropdownBtn = $('ppjs-dropdown-btn') as HTMLButtonElement;
    const dropdownText = $('ppjs-dropdown-text') as HTMLSpanElement;
    const previewBtn = $('ppjs-preview-btn') as HTMLButtonElement;
    const selectBtn = $('ppjs-select-btn') as HTMLButtonElement;
    const drawBtn = $('ppjs-draw-btn') as HTMLButtonElement;
    const toggleBtn = $('ppjs-toggle') as HTMLButtonElement;
    const configCheckboxes = Array.from(root.querySelectorAll('#ppjs-dropdown-menu input[type="checkbox"]')) as HTMLInputElement[];
    const host = document.getElementById('ppjs-root-host') as HTMLDivElement;
    const titlebar = root.querySelector('.ppjs-titlebar') as HTMLDivElement;
    const pauseBtn = $('ppjs-pause-btn') as HTMLButtonElement;
    const cancelBtn = $('ppjs-cancel-btn') as HTMLButtonElement;
    const protect = $('ppjs-protect') as HTMLInputElement;
    const force = $('ppjs-force') as HTMLInputElement;

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

    let previewAnimationFrame: number | null = null;
    let previewRequestId = 0;

    const setActiveTab = (t: string) => {
        activeTab = t;
        tabs.forEach(b => b.classList.toggle('ppjs-active', b.dataset.tab === t));
        panels.forEach(p => p.style.display = p.dataset.panel === t ? '' : 'none');
    };
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

    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
    
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