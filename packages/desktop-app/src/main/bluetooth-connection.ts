import { PrinterConnection } from '@printer-mvp/print-core';
import { Logger } from '@printer-mvp/print-core';

export interface BluetoothConnectionOptions {
  deviceName?: string;
  port?: string;
  logger: Logger;
}

export class DesktopBluetoothConnection implements PrinterConnection {
  private isConnected = false;
  private disconnectListeners: ((reason: string) => void)[] = [];
  private logger: Logger;
  private deviceName: string;

  constructor(options: BluetoothConnectionOptions) {
    this.logger = options.logger;
    this.deviceName = options.deviceName ?? 'POS-5802BT';
  }

  async connect(): Promise<void> {
    this.logger.info(`Connecting to Bluetooth printer: ${this.deviceName}`);
    // Simulate Bluetooth pairing/RFCOMM socket connection
    await new Promise((resolve) => setTimeout(resolve, 600));
    this.isConnected = true;
    this.logger.info(`Connected to Bluetooth printer: ${this.deviceName}`);
  }

  async disconnect(): Promise<void> {
    this.logger.info(`Disconnecting Bluetooth printer: ${this.deviceName}`);
    this.isConnected = false;
    for (const listener of this.disconnectListeners) {
      listener('Disconnected by user');
    }
  }

  async write(bytes: Uint8Array): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Bluetooth connection lost');
    }

    // In a physical environment with serialport / bluetooth-serial-port:
    // this.port.write(Buffer.from(bytes))
    this.logger.info(`Wrote ${bytes.length} bytes to printer`);
  }

  onDisconnect(cb: (reason: string) => void): void {
    this.disconnectListeners.push(cb);
  }

  // Hook for testing or handling external OS Bluetooth drop events
  handleExternalDisconnect(reason: string): void {
    this.isConnected = false;
    for (const listener of this.disconnectListeners) {
      listener(reason);
    }
  }
}
