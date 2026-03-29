// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const net = require('net');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load Vite dev server. Fallback to static file if the server isn't running.
  win.loadURL('http://localhost:5173').catch(() => {
    win.loadFile(path.join(__dirname, 'app', 'index.html'));
  });

  // optional: open devtools for debugging
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// IPC handler to securely proxy database TCP requests from the React frontend
ipcMain.handle('query-db', async (event, query) => {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let responseData = '';

    client.connect(5555, '127.0.0.1', () => {
      client.write(query); // Send SQL string to Rust DB Server
    });

    client.on('data', (data) => {
      responseData += data.toString();
    });

    client.on('end', () => {
      resolve(responseData);
    });

    client.on('error', (err) => {
      reject(err.message);
    });
  });
});