export interface PrinterConnection {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    write(bytes: Uint8Array): Promise<void>;
    onDisconnect(cb: (reason: string) => void): void;
}
export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'PRINTING' | 'RECONNECTING';
export interface ConnectionTransitionEvent {
    from: ConnectionState;
    to: ConnectionState;
    reason?: string;
    timestamp: number;
}
export type DeviceId = 'mobile' | 'desktop';
export type JobStatus = 'queued' | 'sending' | 'sent' | 'failed';
export declare enum PrintErrorType {
    CONNECTION_LOST = "CONNECTION_LOST",
    TIMEOUT = "TIMEOUT",
    DEVICE_BUSY = "DEVICE_BUSY",
    UNSUPPORTED_CONTENT = "UNSUPPORTED_CONTENT",// not retryable
    UNKNOWN = "UNKNOWN"
}
export interface PrintJob {
    id: string;
    deviceId: DeviceId;
    payload: string;
    status: JobStatus;
    attempts: number;
    maxAttempts: number;
    createdAt: number;
    updatedAt: number;
    lastError?: string;
    lastErrorType?: PrintErrorType;
}
export interface JobStore {
    save(job: PrintJob): Promise<void>;
    getNextQueued(): Promise<PrintJob | null>;
    getAll(): Promise<PrintJob[]>;
    getIncomplete(): Promise<PrintJob[]>;
}
export interface Logger {
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
    debug(msg: string, meta?: Record<string, unknown>): void;
}
export declare class DefaultLogger implements Logger {
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
    debug(msg: string, meta?: Record<string, unknown>): void;
}
export declare function classifyError(err: unknown): PrintErrorType;
export declare function toFriendlyErrorMessage(errorType?: PrintErrorType, isFinal?: boolean): string;
//# sourceMappingURL=types.d.ts.map