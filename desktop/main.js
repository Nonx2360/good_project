const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let serverProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Check if we are in development mode
  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'client-dist/index.html'));
  }
  
  win.setMenu(null);
}

function startBackend() {
  const isDev = !app.isPackaged;
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'data.db');

  // In production, we run the transpiled JS.
  // In development, we rely on the already running dev server or start it.
  if (!isDev) {
    const serverPath = path.join(__dirname, 'server-dist/index.js');
    
    serverProcess = fork(serverPath, [], {
      env: { 
        ...process.env, 
        DB_PATH: dbPath,
        PORT: 3001 // Ensure it matches the frontend's expectation
      }
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start backend process:', err);
    });
  }
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill backend process when all windows are closed
  if (serverProcess) {
    serverProcess.kill();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
