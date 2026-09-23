import {
  PrinterConnection,
  ConnectionStateMachine,
  PrintQueueService,
  JobStore,
  PrintJob,
  ConnectionState
} from '@printer-mvp/print-core';

export interface PrintedReceipt {
  id: string;
  jobId: string;
  deviceId: string;
  rawText: string;
  timestamp: number;
}

export class WebSimulatedPrinterConnection implements PrinterConnection {
  public isConnected = false;
  public disconnectReason?: string;
  public shouldFailWrite = false;
  public shouldFailConnect = false;
  public writeDelayMs = 400; // Simulated mechanical print head delay

  private disconnectCallbacks: ((reason: string) => void)[] = [];
  public onRawWrite?: (bytes: Uint8Array) => void;

  async connect(): Promise<void> {
    if (this.shouldFailConnect) {
      throw new Error('Bluetooth connection timed out: device not reachable');
    }
    // Simulate Bluetooth pairing handshake
    await new Promise((r) => setTimeout(r, 600));
    this.isConnected = true;
    this.disconnectReason = undefined;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    const reason = 'User disconnected printer';
    for (const cb of this.disconnectCallbacks) {
      cb(reason);
    }
  }

  async write(bytes: Uint8Array): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Cannot write: Bluetooth connection lost');
    }
    if (this.shouldFailWrite) {
      throw new Error('Bluetooth socket closed unexpectedly during transmission');
    }

    if (this.writeDelayMs > 0) {
      await new Promise((r) => setTimeout(r, this.writeDelayMs));
    }

    if (this.onRawWrite) {
      this.onRawWrite(bytes);
    }
  }

  onDisconnect(callback: (reason: string) => void): () => void {
    this.disconnectCallbacks.push(callback);
    return () => {
      this.disconnectCallbacks = this.disconnectCallbacks.filter((c) => c !== callback);
    };
  }

  triggerSimulatedDisconnect(reason = 'Signal lost (device out of range)'): void {
    this.isConnected = false;
    this.disconnectReason = reason;
    for (const cb of this.disconnectCallbacks) {
      cb(reason);
    }
  }

  simulateHardwareDisconnect(reason = 'Signal lost (device out of range)'): void {
    this.triggerSimulatedDisconnect(reason);
  }
}

export class LocalStorageJobStore implements JobStore {
  private storageKey = 'printer_mvp_jobs';

  private readAll(): PrintJob[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private writeAll(jobs: PrintJob[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(jobs));
    } catch (e) {
      console.error('Failed writing jobs to localStorage', e);
    }
  }

  async save(job: PrintJob): Promise<void> {
    const list = this.readAll();
    const idx = list.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      list[idx] = { ...job };
    } else {
      list.push({ ...job });
    }
    this.writeAll(list);
  }

  async getNextQueued(): Promise<PrintJob | null> {
    const list = this.readAll();
    const queued = list
      .filter((j) => j.status === 'queued')
      .sort((a, b) => a.createdAt - b.createdAt);
    return queued[0] || null;
  }

  async getIncomplete(): Promise<PrintJob[]> {
    const list = this.readAll();
    return list
      .filter((j) => j.status === 'queued' || j.status === 'sending')
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async getAll(): Promise<PrintJob[]> {
    return this.readAll();
  }
}
