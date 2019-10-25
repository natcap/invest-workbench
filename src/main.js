import { spawn, spawnSync } from 'child_process';
import { app, BrowserWindow } from 'electron';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
// import { enableLiveReload } from 'electron-compile';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const isDevMode = process.execPath.match(/[\\/]electron/);

// if (isDevMode) enableLiveReload({ strategy: 'react-hmr' });

const createWindow = async () => {
  
  // Creating the process here with await because sometimes,
  // but not always, the window loads and the first request
  // is made before the server is ready. Unfortunately, it's
  // an intermittent problem, and I'm not certain that await
  // works here, because createPythonProcess is not a Promise.
  // UPDATE: await does not deal with the problem.
  await createPythonProcess();

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  if (isDevMode) {
    await installExtension(REACT_DEVELOPER_TOOLS);
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
};

let pythonServerProcess;
function createPythonProcess() {
  pythonServerProcess = spawn(
    process.env.PYTHON, ['-m', 'flask', 'run'], {
      shell: true,
      // stdio: 'ignore',
      detatched: true,
    });

  console.log('Started python process as PID ' + pythonServerProcess.pid);

  pythonServerProcess.stdout.on('data', (data) => {
    console.log(`${data}`);
  });
  pythonServerProcess.stderr.on('data', (data) => {
    console.log(`${data}`);
  });
  pythonServerProcess.on('error', (err) => {
    console.log('Process failed.');
    console.log(err);
  });
  pythonServerProcess.on('close', (code, signal) => {
    console.log(code);
    console.log('Child process terminated due to signal ' + signal);
  });
}

const exitPythonProcess = () => {
  console.log('Killing python process ' + pythonServerProcess.pid);
  const processKiller = spawnSync(
    'taskkill /PID ' + pythonServerProcess.pid + ' /T /F', {shell: true});
  pythonServerProcess = null;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    exitPythonProcess();
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// Couldn't get this callback to fire, moved to 'window-all-closed',
// but that doesn't cover OSX
// app.on('will-quit', exitPythonProcess);
