// Electron Main Process — BPR Manufacturing Platform Desktop App
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', 'backend', 'server.js');
    backendProcess = fork(serverPath, [], {
      silent: true,
      env: { 
        ...process.env, 
        PORT: '8421', 
        NODE_ENV: 'production', 
        BPR_USER_DATA: app.getPath('userData'),
        BPR_RESOURCES_PATH: process.resourcesPath
      }
    });

    backendProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[Backend]', msg.trim());
      if (msg.includes('localhost:8421')) resolve();
    });

    backendProcess.stderr.on('data', (data) => {
      const errorMsg = data.toString().trim();
      console.error('[Backend Error]', errorMsg);
      const fs = require('fs');
      try { fs.writeFileSync(path.join(app.getPath('userData'), 'crash.log'), errorMsg); } catch(e){}
      const { dialog } = require('electron');
      dialog.showErrorBox('Backend Crash', errorMsg);
    });

    backendProcess.on('error', (err) => {
      const fs = require('fs');
      try { fs.writeFileSync(path.join(app.getPath('userData'), 'crash.log'), err.message); } catch(e){}
      const { dialog } = require('electron');
      dialog.showErrorBox('Backend Spawn Error', err.message);
      reject(err);
    });

    // Timeout resolve after 10s even if message not seen
    setTimeout(resolve, 10000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'BPR Manufacturing Platform',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
    backgroundColor: '#f8f9fb',
  });

  // Load the frontend build
  const frontendPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
  mainWindow.loadFile(frontendPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set custom menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { type: 'separator' },
        { label: 'Exit', accelerator: 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.setZoomLevel(0) },
        { type: 'separator' },
        { label: 'Developer Tools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About BPR Platform', click: () => {
          const { dialog } = require('electron');
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'BPR Manufacturing Platform',
            message: 'BPR Manufacturing Platform v1.0',
            detail: 'Buffer Penetration Ratio Management System\nDesigned for Manufacturing Intelligence'
          });
        }}
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

function prepareDatabase() {
  const fs = require('fs');
  const userDataDbPath = path.join(app.getPath('userData'), 'bpr.db');
  
  // Electron's patched fs can natively read inside app.asar!
  let sourceDb = path.join(__dirname, '..', 'backend', 'db', 'bpr.db');
  if (!fs.existsSync(sourceDb)) {
     sourceDb = path.join(process.resourcesPath, 'db', 'bpr.db');
  }

  if (fs.existsSync(sourceDb)) {
    // Check if AppData DB is missing or corrupted (e.g. 0KB ghost file)
    let needsCopy = !fs.existsSync(userDataDbPath);
    if (!needsCopy) {
       const stats = fs.statSync(userDataDbPath);
       if (stats.size < 20000) needsCopy = true; // Less than 20KB means it's empty
    }
    
    if (needsCopy) {
       console.log('Copying fully-seeded database to AppData:', userDataDbPath);
       try {
         const data = fs.readFileSync(sourceDb);
         fs.writeFileSync(userDataDbPath, data);
       } catch (e) {
         console.error('Failed to copy DB:', e);
       }
    }
  }
}

app.whenReady().then(async () => {
  console.log('Starting BPR Manufacturing Platform...');
  try {
    prepareDatabase();
    await startBackend();
    console.log('Backend started. Launching UI...');
  } catch (err) {
    console.error('Backend start failed:', err);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
