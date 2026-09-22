import {
  ConnectionState,
  ConnectionTransitionEvent,
  PrinterConnection,
  Logger,
  DefaultLogger
} from './types';

export type TransitionCallback = (event: ConnectionTransitionEvent) => void;

export class ConnectionStateMachine {
  private currentState: ConnectionState = 'DISCONNECTED';
  private listeners: Set<TransitionCallback> = new Set();
  private transitionLock: Promise<void> = Promise.resolve();
  private connection?: PrinterConnection;
  private logger: Logger;

  constructor(connection?: PrinterConnection, logger: Logger = new DefaultLogger()) {
    this.connection = connection;
    this.logger = logger;

    if (this.connection) {
      this.connection.onDisconnect((reason) => {
        if (this.currentState !== 'RECONNECTING' && this.currentState !== 'DISCONNECTED') {
          this.logger.warn(`Printer connection lost: ${reason}`);
          this.transitionTo('DISCONNECTED', reason).catch((err) => {
            this.logger.error('Error transitioning to DISCONNECTED on disconnect event', { err });
          });
        }
      });
    }
  }

  public setConnection(connection: PrinterConnection): void {
    this.connection = connection;
    this.connection.onDisconnect((reason) => {
      if (this.currentState !== 'RECONNECTING' && this.currentState !== 'DISCONNECTED') {
        this.logger.warn(`Printer connection lost: ${reason}`);
        this.transitionTo('DISCONNECTED', reason).catch((err) => {
          this.logger.error('Error transitioning to DISCONNECTED on disconnect event', { err });
        });
      }
    });
  }

  public getState(): ConnectionState {
    return this.currentState;
  }

  public onTransition(callback: TransitionCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Thread-safe / lock-protected state transition
   */
  public async transitionTo(to: ConnectionState, reason?: string): Promise<void> {
    const nextLock = this.transitionLock.then(async () => {
      const from = this.currentState;
      if (from === to) {
        return;
      }

      this.currentState = to;
      const event: ConnectionTransitionEvent = {
        from,
        to,
        reason,
        timestamp: Date.now()
      };

      this.logger.info(`State transition: ${from} -> ${to}${reason ? ` (${reason})` : ''}`, {
        from,
        to,
        reason
      });

      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (listenerErr) {
          this.logger.error('Error in transition listener', { listenerErr });
        }
      }
    });

    this.transitionLock = nextLock.catch(() => {});
    return nextLock;
  }

  /**
   * Handles write failure/timeout:
   * Transitions to RECONNECTING -> attempts one reconnect -> CONNECTED or DISCONNECTED.
   */
  public async handleWriteFailure(reason: string): Promise<boolean> {
    await this.transitionTo('RECONNECTING', reason);

    if (!this.connection) {
      await this.transitionTo('DISCONNECTED', 'No connection available to reconnect');
      return false;
    }

    try {
      this.logger.info('Attempting single automatic reconnect after failure');
      await this.connection.disconnect().catch(() => {});
      await this.connection.connect();
      await this.transitionTo('CONNECTED', 'Reconnected successfully');
      return true;
    } catch (reconnectErr) {
      const failReason = reconnectErr instanceof Error ? reconnectErr.message : String(reconnectErr);
      this.logger.warn(`Reconnect attempt failed: ${failReason}`);
      await this.transitionTo('DISCONNECTED', `Reconnect failed: ${failReason}`);
      return false;
    }
  }
}
