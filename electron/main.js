// Electron Main Process — BPR Manufacturing Platform Desktop App (Cloud Mode)
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const CLOUD_URL = 'https://bpr-manufacturing-platform.onrender.com';

let mainWindow;

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

  // Load from cloud server — shared database across all devices
  mainWindow.loadURL(CLOUD_URL);

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
            detail: 'Cloud-Connected Manufacturing Intelligence\nAll data syncs across devices in real-time.'
          });
        }}
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

app.whenReady().then(() => {
  console.log('Starting BPR Manufacturing Platform (Cloud Mode)...');
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
