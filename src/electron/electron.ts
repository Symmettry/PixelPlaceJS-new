import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { PixelPlace } from '../PixelPlace';
import { Bot } from '../bot/Bot';
import { Packets } from '../util/packets/Packets';
import { StatType } from '../util/data/Statistics';
import { BaseModes, ModeConfigs, Modes } from '../util/data/Modes';
import { ImageUtil } from '../util/drawing/ImageUtil';
import { EffectMode, FilterMode } from '../util/drawing/ImageEffects';
import { LoadPresets } from '../bot/PixelQueue';
import { QueueSide } from '../util/data/Data';

let mainWindow: BrowserWindow | null = null;

let pp: PixelPlace | null = null; 
let bot: Bot | null = null;
let boardid: number | null = null;
let paused = false;
let isProtecting = false;

function getMode(type: 'of' | 'toSort', mode: string, modeConfigs: string[]): any {
    return Modes[type](BaseModes[mode as keyof typeof BaseModes], modeConfigs.map((k: string) => ModeConfigs[k as keyof typeof ModeConfigs]));
}

ipcMain.on('page-info', async (_event, payload) => {
    const [key, value] = payload;

    switch(key) {
        case "init": {
            const {boardID, cookies: {authKey, authId, authToken}} = value;
            if(!boardID || !authKey || !authId || !authToken) return console.log("Error: Not logged in: boardID?", !!boardID, "authKey?", !!authKey, "authId?", !!authId, "authToken?", !!authToken);
            
            boardid = boardID;

            console.log("Connecting to board id", boardID);
            if(pp != null) {
                pp.Close();
            }
            pp = new PixelPlace([{
                authData: {
                    authKey, authId, authToken,
                },
                boardID,
            }], {autoRestart: false, exitOnClose: false});

            await pp.Init();

            bot = pp.bots[0];

            bot.on(Packets.RECEIVED.LIB_SOCKET_CLOSE, () => {
                mainWindow?.webContents.send('server-message', ['close'])
            });

            bot.addDebugger({
                ignorePixelPacket: true,
                lineClears: true,
            });
            bot.startStats({
                mode: "stdout",
                interval: 100,
                delimiter: "-",
                stats: [
                    StatType.TIME,
                    StatType.RATE,
                    StatType.PLACED,
                    StatType.FAILED,
                    StatType.PING,
                    StatType.LAG,
                    StatType.LOAD,
                    StatType.SLOWDOWN
                ]
            });

            bot.setLoadData(LoadPresets.FAST);
            bot.setProtectSide(QueueSide.FRONT);

            break;
        }
        case "draw": {
            if(pp == null || bot == null) return;
            const {x, y, hasImage, height, width, mode, protect, force, modeConfigs, imageData} = value;
            if(!hasImage || !imageData) return;
            const imageBuffer = Buffer.from(imageData, 'base64');
            if(!imageBuffer || !Buffer.isBuffer(imageBuffer)) return;

            paused = false;
            isProtecting = protect;
            await bot.drawImage({
                x, y,
                width, height,
                force, protect,
                mode: getMode('of', mode, modeConfigs),
                buffer: imageBuffer,
                async: false,
            });
            await bot.finishQueue();
            if(paused || isProtecting) return;
            mainWindow?.webContents.send('server-message', ['draw_finished'])
            break;
        }
        case "cancel": {
            bot!.clearQueue();
            bot!.unprotectAll();
            break;
        }
        case "pause": {
            bot!.pause();
            paused = true;
            break;
        }
        case "start": {
            bot!.start();
            paused = false;
            await bot!.finishQueue();
            if(paused || isProtecting) return;
            mainWindow?.webContents.send('server-message', ['draw_finished'])
            break;
        }
        case 'sort': {
            const { width, height, mode, modeConfigs, imageData, hasImage } = value;
            if(!hasImage || !imageData) return;
            const imageBuffer = Buffer.from(imageData, 'base64');
            if(!imageBuffer || !Buffer.isBuffer(imageBuffer)) return;
            const fullMode = getMode('toSort', mode, modeConfigs);
            const pixels = await ImageUtil.getPixelData(width, height, FilterMode.STANDARD, EffectMode.NONE, bot!.headers, boardid!, undefined, undefined, undefined, imageBuffer);
            mainWindow?.webContents.send('server-message', ['sorted', fullMode(pixels)]);
            break;
        }
        case "close": {
            if(pp == null) return;
            pp.Close();
            pp = null;
            break;
        }
        default: {
            console.log("<UNIMPLEMENTED>", key, value);
            break;
        }
    }
});

function createMainWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        show: false,
        backgroundColor: '#111111',
        autoHideMenuBar: true,
        title: 'PixelPlace',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            devTools: true,
            webSecurity: true,
        },
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    void mainWindow.loadURL('https://pixelplace.io');

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        void shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
        const allowedHosts = new Set(['pixelplace.io', 'www.pixelplace.io']);
        const hostname = new URL(url).hostname;

        if (!allowedHosts.has(hostname)) {
            event.preventDefault();
            void shell.openExternal(url);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});