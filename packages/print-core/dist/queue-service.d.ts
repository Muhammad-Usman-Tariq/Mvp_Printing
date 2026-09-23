import { DeviceId, JobStore, Logger, PrinterConnection, PrintJob } from './types';
import { ConnectionStateMachine } from './state-machine';
export interface PrintQueueConfig {
    writeTimeoutMs?: number;
    maxAttempts?: number;
    baseBackoffMs?: number;
    maxBackoffMs?: number;
    onJobComplete?: (job: PrintJob) => void;
    onJobStatusChange?: (job: PrintJob) => void;
}
export declare function generateJobId(): string;
export declare class PrintQueueService {
    private connection;
    private stateMachine;
    private jobStore;
    private logger;
    private config;
    private isWorkerRunning;
    private currentJob;
    private nextRunTimeout;
    constructor(connection: PrinterConnection, stateMachine: ConnectionStateMachine, jobStore: JobStore, config?: PrintQueueConfig, logger?: Logger);
    isBusy(): boolean;
    getCurrentJob(): PrintJob | null;
    /**
     * Enqueue a new print job.
     */
    enqueue(payload: string, deviceId: DeviceId, maxAttempts?: number): Promise<PrintJob>;
    /**
     * Startup recovery: resets any lingering 'sending' jobs back to 'queued'
     * and triggers the worker loop.
     */
    resumeIncomplete(): Promise<void>;
    triggerWorker(): void;
    private processQueueLoop;
    private processSingleJob;
    private ensureConnected;
    private writeWithTimeout;
    private handleJobFailure;
}
//# sourceMappingURL=queue-service.d.ts.map