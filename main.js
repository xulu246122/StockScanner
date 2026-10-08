import electronPkg from 'electron';
const { app, BrowserWindow, Menu, dialog, ipcMain, Tray, nativeImage } = electronPkg;
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;
let tray = null;
let isQuitting = false;
const PORT = 3000;
let backendStatus = 'Starting';
let apiHealthy = false;

// Logs setup
const logDir = app.getPath('userData');
const logFile = path.join(logDir, 'app.log');
function writeLog(msg) {
    try {
        const line = `[${new Date().toISOString()}] ${msg}\n`;
        fs.appendFileSync(logFile, line);
        console.log(line.trim());
    } catch (err) {
        console.log(msg);
    }
}

writeLog('App startup initiated');

function showTrayBalloon(title, content) {
    try {
        if (tray && process.platform === 'win32') {
            tray.displayBalloon({
                title,
                content
            });
        }
    } catch (err) {
        writeLog(`[BALLOON ERR] ${err.message}`);
    }
}

function getAppIcon() {
    const icoPath = path.join(__dirname, 'public', 'icon.ico');
    const pngPath = path.join(__dirname, 'public', 'icon.png');
    if (fs.existsSync(icoPath)) {
        return nativeImage.createFromPath(icoPath);
    }
    if (fs.existsSync(pngPath)) {
        return nativeImage.createFromPath(pngPath);
    }
    return nativeImage.createEmpty();
}

function createTray() {
    if (tray) return;
    try {
        const icon = getAppIcon();
        tray = new Tray(icon);
        tray.setToolTip('V6.5 美股量化扫描终端 (后台实时监控中)');

        const contextMenu = Menu.buildFromTemplate([
            {
                label: '📊 显示量化终端主界面',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                }
            },
            { type: 'separator' },
            {
                label: '🟢 盘中预警引擎: 实时运行中',
                enabled: false
            },
            {
                label: '⚡ 本地 WebSocket 流: 已挂载',
                enabled: false
            },
            {
                label: '⚙️ 终端系统设置',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.focus();
                        mainWindow.webContents.send('navigate-to-tab', 'settings');
                    }
                }
            },
            { type: 'separator' },
            {
                label: '🚪 退出程序',
                click: () => {
                    writeLog('[TRAY] User selected Exit Application from tray context menu');
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);

        tray.setContextMenu(contextMenu);

        // Click on tray icon: toggle/restore window
        tray.on('click', () => {
            if (!mainWindow) return;
            if (mainWindow.isVisible()) {
                if (mainWindow.isFocused()) {
                    mainWindow.hide();
                } else {
                    mainWindow.focus();
                }
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        });

        // Double click on tray icon: show and bring to front
        tray.on('double-click', () => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            }
        });

        writeLog('[TRAY] System tray icon initialized successfully');
    } catch (err) {
        writeLog(`[TRAY ERR] Failed to create tray: ${err.message}`);
    }
}

// IPC Handlers for window controls & tray
ipcMain.handle('window-minimize', () => {
    if (mainWindow) {
        mainWindow.hide();
        showTrayBalloon('已最小化至系统托盘', 'V6.5 美股量化终端在后台保持运行，持续监控行情与预警。');
    }
});

ipcMain.handle('window-minimize-to-tray', () => {
    if (mainWindow) {
        mainWindow.hide();
        showTrayBalloon('已最小化至系统托盘', 'V6.5 美股量化终端在后台保持运行，持续监控行情与预警。');
    }
});

ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow?.maximize();
    }
});

ipcMain.handle('window-close', () => {
    mainWindow?.close();
});

ipcMain.handle('window-show', () => {
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
    }
});

ipcMain.handle('window-hide', () => {
    if (mainWindow) {
        mainWindow.hide();
    }
});

ipcMain.handle('app-quit', () => {
    writeLog('[APP] app-quit invoked from renderer');
    isQuitting = true;
    app.quit();
});

ipcMain.handle('show-native-notification', (event, payload) => {
    try {
        const NativeNotification = electronPkg.Notification;
        if (NativeNotification && NativeNotification.isSupported()) {
            const notif = new NativeNotification({
                title: payload?.title || '美股量化预警',
                body: payload?.body || '发现高胜率策略信号',
                urgency: 'critical',
                silent: false,
                icon: getAppIcon()
            });

            notif.on('click', () => {
                writeLog(`[NOTIFICATION CLICK] Ticker: ${payload?.metadata?.ticker || payload?.ticker || 'N/A'}`);
                if (mainWindow) {
                    if (!mainWindow.isVisible()) mainWindow.show();
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.focus();
                    const alertData = payload?.metadata || {
                        ticker: payload?.ticker,
                        view: payload?.view || 'rebound',
                        title: payload?.title,
                        body: payload?.body
                    };
                    mainWindow.webContents.send('alert-notification-clicked', alertData);
                }
            });

            notif.show();
            return true;
        }
    } catch (e) {
        writeLog(`[NOTIFICATION ERR] ${e.message}`);
    }
    return false;
});

function getPersistentDataDir() {
    // 1. Portable exe directory (injected by electron-builder portable target)
    if (process.env.PORTABLE_EXECUTABLE_DIR) {
        const portableDataDir = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
        try {
            if (!fs.existsSync(portableDataDir)) fs.mkdirSync(portableDataDir, { recursive: true });
            const testFile = path.join(portableDataDir, '.test_write');
            fs.writeFileSync(testFile, 'ok');
            fs.unlinkSync(testFile);
            writeLog(`[DATA DIR] Portable directory verified: ${portableDataDir}`);
            return portableDataDir;
        } catch (e) {
            writeLog(`[DATA DIR] Portable dir not writable: ${e.message}`);
        }
    }

    // 2. Packaged exe directory (e.g. release\win-unpacked\)
    if (app.isPackaged) {
        const exeDir = path.dirname(process.execPath);
        const exeDataDir = path.join(exeDir, 'data');
        try {
            if (!fs.existsSync(exeDataDir)) fs.mkdirSync(exeDataDir, { recursive: true });
            const testFile = path.join(exeDataDir, '.test_write');
            fs.writeFileSync(testFile, 'ok');
            fs.unlinkSync(testFile);
            writeLog(`[DATA DIR] Exe-adjacent directory verified: ${exeDataDir}`);
            return exeDataDir;
        } catch (e) {
            writeLog(`[DATA DIR] Exe dir not writable: ${e.message}`);
        }
    }

    // 3. Fallback to OS user data directory (%APPDATA%\com.v65.desktop\data)
    const userDataDir = path.join(app.getPath('userData'), 'data');
    if (!fs.existsSync(userDataDir)) {
        try { fs.mkdirSync(userDataDir, { recursive: true }); } catch {}
    }
    writeLog(`[DATA DIR] Using standard userData directory: ${userDataDir}`);
    return userDataDir;
}

function startBackend() {
    return new Promise((resolve, reject) => {
        writeLog('Starting Local Backend...');
        const serverPath = path.join(__dirname, 'dist', 'server.cjs');
        if (!fs.existsSync(serverPath)) {
            const err = `Backend bundle not found at: ${serverPath}`;
            writeLog(`[BACKEND ERROR] ${err}`);
            return reject(new Error(err));
        }

        const persistentDataDir = getPersistentDataDir();
        serverProcess = spawn(process.execPath, [serverPath], {
            cwd: path.dirname(path.dirname(serverPath)),
            env: {
                ...process.env,
                ELECTRON_RUN_AS_NODE: '1',
                NODE_ENV: 'production',
                PORT: PORT.toString(),
                V65_DATA_DIR: persistentDataDir,
                ELECTRON_USER_DATA: app.getPath('userData')
            },
            stdio: 'pipe'
        });

        serverProcess.stdout.on('data', (d) => writeLog(`[BACKEND] ${d.toString().trim()}`));
        serverProcess.stderr.on('data', (d) => {
            const msg = d.toString().trim();
            writeLog(`[BACKEND ERR] ${msg}`);
            backendStatus = 'Error';
        });

        serverProcess.on('exit', (code) => {
            writeLog(`Backend exited with code ${code}`);
            backendStatus = 'Stopped';
            apiHealthy = false;
        });

        let retries = 0;
        const checkPort = () => {
            const req = http.get(`http://127.0.0.1:${PORT}`, (res) => {
                apiHealthy = true;
                backendStatus = 'Running';
                writeLog('Backend Ready.');
                resolve();
            });
            req.on('error', () => {
                retries++;
                if (retries > 30) {
                    writeLog('Backend startup timeout');
                    backendStatus = 'Timeout';
                    reject(new Error('Backend timeout'));
                } else {
                    setTimeout(checkPort, 500);
                }
            });
        };
        setTimeout(checkPort, 1000);
    });
}

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1360,
        height: 860,
        minWidth: 1024,
        minHeight: 700,
        frame: false,
        titleBarStyle: 'hidden',
        autoHideMenuBar: true,
        backgroundColor: '#131722',
        show: false,
        title: 'V6.5 US Stock AI Scanner & Alert',
        icon: getAppIcon(),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false, // Prevents background timer & WS throttling when minimized to tray
            preload: path.join(__dirname, 'preload.cjs')
        }
    });
    
    Menu.setApplicationMenu(null);
    mainWindow.setMenuBarVisibility(false);

    // Show window when content is ready to prevent blank/white flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Fallback: Ensure window shows even if ready-to-show takes longer
    setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
            mainWindow.show();
        }
    }, 3000);

    // Close prevention: prompt confirmation modal in renderer if not explicitly quitting
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.webContents.send('request-close-action');
        }
    });

    // Support F12 or Ctrl+Shift+I for developer diagnostics
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
            mainWindow.webContents.toggleDevTools();
        }
    });

    try {
        await startBackend();
        
        mainWindow.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
            writeLog(`[RENDERER] ${message}`);
        });

        mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
            writeLog(`Renderer failed to load: ${errorCode} ${errorDescription} (${validatedURL})`);
        });
        
        mainWindow.webContents.on('did-finish-load', () => {
            writeLog('Frontend loaded successfully');
        });

        await mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

    } catch (e) {
        writeLog(`Failed to start: ${e.message}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
                <body style="background:#131722;color:#f87171;font-family:sans-serif;padding:32px;">
                    <h2>V6.5 Desktop Preview 启动失败</h2>
                    <p style="color:#e2e8f0;">${e.message}</p>
                    <p style="color:#94a3b8;font-size:12px;">日志路径: ${logFile}</p>
                </body>
            `)}`);
        }
    }
}

app.whenReady().then(async () => {
    createTray();
    await createWindow();
});

app.on('window-all-closed', function () {
    // Keep running in system tray unless explicitly quitting
    if (isQuitting) {
        app.quit();
    }
});

app.on('before-quit', () => {
    writeLog('App shutdown initiated');
    isQuitting = true;
    if (tray) {
        try { tray.destroy(); } catch {}
        tray = null;
    }
    if (serverProcess) {
        try {
            serverProcess.kill('SIGTERM');
        } catch {
            try { serverProcess.kill(); } catch {}
        }
        writeLog('Backend stopped');
    }
});
