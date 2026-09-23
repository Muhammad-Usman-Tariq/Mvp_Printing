export type DeviceId = 'mobile' | 'desktop';
export type JobStatus = 'queued' | 'sending' | 'sent' | 'failed';

export enum PrintErrorType {
  CONNECTION_LOST = 'CONNECTION_LOST',
  TIMEOUT = 'TIMEOUT',
  DEVICE_BUSY = 'DEVICE_BUSY',
  UNSUPPORTED_CONTENT = 'UNSUPPORTED_CONTENT',
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
