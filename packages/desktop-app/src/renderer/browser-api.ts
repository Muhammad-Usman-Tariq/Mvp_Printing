import {
  ConnectionStateMachine,
  PrintQueueService,
  PrinterConnection,
  JobStore,
  PrintJob,
  DefaultLogger
} from '@printer-mvp/print-core';
import { PrinterAPI } from '../preload';

class BrowserSimulatedConnection implements PrinterConnection {
  private isConnected = true;
  private disconnectListeners: ((reason: string) => void)[] = [];

  async connect(): Promise<void> {
    await new Promise((r) => setTimeout(r, 600));
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    for (const cb of this.disconnectListeners) {
      cb('Disconnected by user');
    }
  }

  async write(_bytes: Uint8Array): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Bluetooth connection lost');
    }
    // Simulate mechanical printer write
    await new Promise((r) => setTimeout(r, 1200));
  }

  onDisconnect(cb: (reason: string) => void): void {
    this.disconnectListeners.push(cb);
  }
}

class BrowserLocalStorageStore implements JobStore {
  private key = 'desktop_jobs_store';

  private load(): PrintJob[] {
    try {
      const item = localStorage.getItem(this.key);
      return item ? JSON.parse(item) : [];
    } catch {
      return [];
    }
  }

  private saveAll(jobs: PrintJob[]) {
    try {
      localStorage.setItem(this.key, JSON.stringify(jobs));
    } catch {}
  }

  async save(job: PrintJob): Promise<void> {
    const list = this.load();
    const idx = list.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      list[idx] = { ...job };
    } else {
      list.push({ ...job });
    }
    this.saveAll(list);
  }

  async getNextQueued(): Promise<PrintJob | null> {
    const queued = this.load()
      .filter((j) => j.status === 'queued')
      .sort((a, b) => a.createdAt - b.createdAt);
    return queued[0] || null;
  }

  async getAll(): Promise<PrintJob[]> {
    return this.load().sort((a, b) => b.createdAt - a.createdAt);
  }

  async getIncomplete(): Promise<PrintJob[]> {
    return this.load()
      .filter((j) => j.status === 'queued' || j.status === 'sending')
      .sort((a, b) => a.createdAt - b.createdAt);
  }
}

export function initBrowserPrinterAPI(): PrinterAPI {
  const connection = new BrowserSimulatedConnection();
  const stateMachine = new ConnectionStateMachine(connection, new DefaultLogger());
  const store = new BrowserLocalStorageStore();

  const stateListeners = new Set<(state: string) => void>();
  const jobListeners = new Set<(job: PrintJob) => void>();

  stateMachine.onTransition((e) => {
    for (const l of stateListeners) l(e.to);
  });

  const queueService = new PrintQueueService(
    connection,
    stateMachine,
    store,
    {
      writeTimeoutMs: 5000,
      maxAttempts: 3,
      baseBackoffMs: 1000,
      maxBackoffMs: 8000,
      onJobComplete: (job) => {
        for (const l of jobListeners) l(job);
      },
      onJobStatusChange: (job) => {
        for (const l of jobListeners) l(job);
      }
    },
    new DefaultLogger()
  );

  queueService.resumeIncomplete();

  return {
    getState: async () => stateMachine.getState(),
    connect: async () => {
      await stateMachine.transitionTo('CONNECTING');
      await connection.connect();
      await stateMachine.transitionTo('CONNECTED');
      return { success: true };
    },
    disconnect: async () => {
      await connection.disconnect();
      await stateMachine.transitionTo('DISCONNECTED');
      return { success: true };
    },
    print: async (payload: string) => {
      const job = await queueService.enqueue(payload, 'desktop', 3);
      return job;
    },
    getRecentJobs: async () => {
      const all = await store.getAll();
      return all.filter((j) => j.deviceId === 'desktop').slice(0, 10);
    },
    onStateChanged: (cb) => {
      stateListeners.add(cb);
      return () => stateListeners.delete(cb);
    },
    onJobStatusChanged: (cb) => {
      jobListeners.add(cb);
      return () => jobListeners.delete(cb);
    }
  };
}
