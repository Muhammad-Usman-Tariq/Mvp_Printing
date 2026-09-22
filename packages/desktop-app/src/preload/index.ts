import { contextBridge, ipcRenderer } from 'electron';
import { PrintJob } from '@printer-mvp/print-core';

export interface PrinterAPI {
  getState: () => Promise<string>;
  connect: () => Promise<{ success: boolean; error?: string }>;
  disconnect: () => Promise<{ success: boolean }>;
  print: (payload: string) => Promise<PrintJob>;
  getRecentJobs: () => Promise<PrintJob[]>;
  onStateChanged: (cb: (state: string) => void) => () => void;
  onJobStatusChanged: (cb: (job: PrintJob) => void) => () => void;
}

const api: PrinterAPI = {
  getState: () => ipcRenderer.invoke('printer:get-state'),
  connect: () => ipcRenderer.invoke('printer:connect'),
  disconnect: () => ipcRenderer.invoke('printer:disconnect'),
  print: (payload: string) => ipcRenderer.invoke('printer:print', payload),
  getRecentJobs: () => ipcRenderer.invoke('printer:get-jobs'),
  onStateChanged: (cb) => {
    const handler = (_: any, state: string) => cb(state);
    ipcRenderer.on('printer:state-changed', handler);
    return () => ipcRenderer.removeListener('printer:state-changed', handler);
  },
  onJobStatusChanged: (cb) => {
    const handler = (_: any, job: PrintJob) => cb(job);
    ipcRenderer.on('printer:job-status-changed', handler);
    return () => ipcRenderer.removeListener('printer:job-status-changed', handler);
  }
};

contextBridge.exposeInMainWorld('printerAPI', api);

declare global {
  interface Window {
    printerAPI: PrinterAPI;
  }
}
