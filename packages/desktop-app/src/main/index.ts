import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import pino from 'pino';
import {
  ConnectionStateMachine,
  PrintQueueService,
  Logger,
  PrintJob
} from '@printer-mvp/print-core';
import { SqliteJobStore } from '@printer-mvp/job-store-sqlite';
import { DesktopBluetoothConnection } from './bluetooth-connection';

// Configure Pino structured logger to write to disk
const logFilePath = path.join(app.getPath('userData'), 'printer-desktop.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
const pinoLogger = pino({ level: 'info' }, logStream);

const domainLogger: Logger = {
  info: (msg, meta) => pinoLogger.info(meta ?? {}, msg),
  warn: (msg, meta) => pinoLogger.warn(meta ?? {}, msg),
  error: (msg, meta) => pinoLogger.error(meta ?? {}, msg),
  debug: (msg, meta) => pinoLogger.debug(meta ?? {}, msg)
};

let mainWindow: BrowserWindow | null = null;
let queueService: PrintQueueService;
let stateMachine: ConnectionStateMachine;
let jobStore: SqliteJobStore;
let bluetoothConnection: DesktopBluetoothConnection;

async function initializeServices() {
  domainLogger.info('Initializing desktop printer services...');

  // Initialize plain local SQLite store (better-sqlite3)
  const dbPath = path.join(app.getPath('userData'), 'local-print-jobs.db');
  jobStore = new SqliteJobStore(dbPath);

  // Initialize hardware connection adapter
  bluetoothConnection = new DesktopBluetoothConnection({
    deviceName: 'POS-5802BT',
    logger: domainLogger
  });

  // Initialize state machine
  stateMachine = new ConnectionStateMachine(bluetoothConnection, domainLogger);
  stateMachine.onTransition((event) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('printer:state-changed', event.to);
    }
  });

  // Initialize Queue service
  queueService = new PrintQueueService(
    bluetoothConnection,
    stateMachine,
    jobStore,
    {
      writeTimeoutMs: 5000,
      maxAttempts: 3,
      baseBackoffMs: 1000,
      maxBackoffMs: 8000,
      onJobComplete: (job) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('printer:job-status-changed', job);
        }
      },
      onJobStatusChange: (job) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('printer:job-status-changed', job);
        }
      }
    },
    domainLogger
  );

  // Resume incomplete jobs on startup before accepting new UI jobs
  await queueService.resumeIncomplete();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 700,
    minWidth: 500,
    minHeight: 600,
    title: 'Receipt Printer',
    backgroundColor: '#F5F5F7',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load production renderer build or dev server
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('printer:get-state', () => {
  return stateMachine ? stateMachine.getState() : 'DISCONNECTED';
});

ipcMain.handle('printer:connect', async () => {
  try {
    await stateMachine.transitionTo('CONNECTING', 'User pressed connect');
    await bluetoothConnection.connect();
    await stateMachine.transitionTo('CONNECTED', 'Connected');
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await stateMachine.transitionTo('DISCONNECTED', errorMsg);
    return { success: false, error: errorMsg };
  }
});

ipcMain.handle('printer:disconnect', async () => {
  await bluetoothConnection.disconnect();
  await stateMachine.transitionTo('DISCONNECTED', 'User pressed disconnect');
  return { success: true };
});

ipcMain.handle('printer:print', async (_, payload: string) => {
  if (!queueService) throw new Error('Printer queue service not initialized');
  const job = await queueService.enqueue(payload, 'desktop', 3);
  return job;
});

ipcMain.handle('printer:get-jobs', async () => {
  if (!jobStore) return [];
  const all = await jobStore.getAll();
  return all.filter((j: PrintJob) => j.deviceId === 'desktop').slice(0, 10);
});

app.whenReady().then(async () => {
  await initializeServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
