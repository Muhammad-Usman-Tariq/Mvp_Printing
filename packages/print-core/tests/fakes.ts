import { JobStore, PrinterConnection, PrintJob } from '../src/types';

export class FakePrinterConnection implements PrinterConnection {
  public isConnected = false;
  public writtenChunks: Uint8Array[] = [];
  public disconnectListeners: ((reason: string) => void)[] = [];

  // Failure simulation hooks
  public shouldFailConnect = false;
  public failConnectError = 'Bluetooth connection refused';
  public shouldFailWrite = false;
  public failWriteError = 'Bluetooth socket closed unexpectedly';
  public writeDelayMs = 0;

  async connect(): Promise<void> {
    if (this.shouldFailConnect) {
      throw new Error(this.failConnectError);
    }
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    for (const listener of this.disconnectListeners) {
      listener('Explicit disconnect called');
    }
  }

  async write(bytes: Uint8Array): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Cannot write: printer is disconnected');
    }
    if (this.shouldFailWrite) {
      throw new Error(this.failWriteError);
    }
    if (this.writeDelayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, this.writeDelayMs));
    }
    this.writtenChunks.push(new Uint8Array(bytes));
  }

  onDisconnect(cb: (reason: string) => void): void {
    this.disconnectListeners.push(cb);
  }

  simulateDisconnect(reason = 'Device disconnected mid-transmission'): void {
    this.isConnected = false;
    for (const listener of this.disconnectListeners) {
      listener(reason);
    }
  }

  getAllWrittenBytes(): Uint8Array {
    const totalLength = this.writtenChunks.reduce((acc, c) => acc + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.writtenChunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  clearWritten(): void {
    this.writtenChunks = [];
  }
}

export class FakeJobStore implements JobStore {
  private jobs: Map<string, PrintJob> = new Map();

  async save(job: PrintJob): Promise<void> {
    this.jobs.set(job.id, { ...job });
  }

  async getNextQueued(): Promise<PrintJob | null> {
    // Return oldest job with status 'queued' (FIFO)
    const queuedJobs = Array.from(this.jobs.values())
      .filter((j) => j.status === 'queued')
      .sort((a, b) => a.createdAt - b.createdAt);

    if (queuedJobs.length === 0) return null;
    return { ...queuedJobs[0] };
  }

  async getAll(): Promise<PrintJob[]> {
    return Array.from(this.jobs.values())
      .map((j) => ({ ...j }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async getIncomplete(): Promise<PrintJob[]> {
    return Array.from(this.jobs.values())
      .filter((j) => j.status === 'queued' || j.status === 'sending')
      .map((j) => ({ ...j }))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  // Test helper to seed state
  seedJobs(jobs: PrintJob[]): void {
    for (const job of jobs) {
      this.jobs.set(job.id, { ...job });
    }
  }

  getJob(id: string): PrintJob | undefined {
    const job = this.jobs.get(id);
    return job ? { ...job } : undefined;
  }
}
