export interface PrinterConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  write(bytes: Uint8Array): Promise<void>;
  onDisconnect(cb: (reason: string) => void): void;
}

export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'PRINTING'
  | 'RECONNECTING';

export interface ConnectionTransitionEvent {
  from: ConnectionState;
  to: ConnectionState;
  reason?: string;
  timestamp: number;
}

export type DeviceId = 'mobile' | 'desktop';
export type JobStatus = 'queued' | 'sending' | 'sent' | 'failed';

export enum PrintErrorType {
  CONNECTION_LOST = 'CONNECTION_LOST',
  TIMEOUT = 'TIMEOUT',
  DEVICE_BUSY = 'DEVICE_BUSY',
  UNSUPPORTED_CONTENT = 'UNSUPPORTED_CONTENT', // not retryable
  UNKNOWN = 'UNKNOWN'
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

export class DefaultLogger implements Logger {
  info(msg: string, meta?: Record<string, unknown>): void {
    console.info(`[INFO] ${msg}`, meta ? JSON.stringify(meta) : '');
  }
  warn(msg: string, meta?: Record<string, unknown>): void {
    console.warn(`[WARN] ${msg}`, meta ? JSON.stringify(meta) : '');
  }
  error(msg: string, meta?: Record<string, unknown>): void {
    console.error(`[ERROR] ${msg}`, meta ? JSON.stringify(meta) : '');
  }
  debug(msg: string, meta?: Record<string, unknown>): void {
    // Silent by default in standard runs
  }
}

export function classifyError(err: unknown): PrintErrorType {
  if (!err) return PrintErrorType.UNKNOWN;

  if (typeof err === 'object' && err !== null && 'type' in err) {
    const errorWithType = err as { type: string };
    if (Object.values(PrintErrorType).includes(errorWithType.type as PrintErrorType)) {
      return errorWithType.type as PrintErrorType;
    }
  }

  const message = err instanceof Error ? err.message : String(err);
  const normalized = message.toLowerCase();

  if (
    normalized.includes('unsupported') ||
    normalized.includes('invalid character') ||
    normalized.includes('encoding') ||
    normalized.includes('code page')
  ) {
    return PrintErrorType.UNSUPPORTED_CONTENT;
  }

  if (
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('deadline exceeded')
  ) {
    return PrintErrorType.TIMEOUT;
  }

  if (
    normalized.includes('busy') ||
    normalized.includes('device_busy') ||
    normalized.includes('locked') ||
    normalized.includes('resource in use')
  ) {
    return PrintErrorType.DEVICE_BUSY;
  }

  if (
    normalized.includes('connection lost') ||
    normalized.includes('disconnected') ||
    normalized.includes('closed') ||
    normalized.includes('econnreset') ||
    normalized.includes('broken pipe') ||
    normalized.includes('device not reachable') ||
    normalized.includes('bluetooth')
  ) {
    return PrintErrorType.CONNECTION_LOST;
  }

  return PrintErrorType.UNKNOWN;
}

export function toFriendlyErrorMessage(errorType?: PrintErrorType, isFinal = false): string {
  const retrySuffix = isFinal ? '' : ' Trying again…';

  switch (errorType) {
    case PrintErrorType.CONNECTION_LOST:
      return `Couldn't print — printer disconnected.${retrySuffix}`;
    case PrintErrorType.TIMEOUT:
      return `Couldn't print — printer didn't respond.${retrySuffix}`;
    case PrintErrorType.DEVICE_BUSY:
      return `Couldn't print — printer is busy.${retrySuffix}`;
    case PrintErrorType.UNSUPPORTED_CONTENT:
      return `Couldn't print — try a different value.`;
    default:
      return `Couldn't print — something went wrong.${retrySuffix}`;
  }
}

