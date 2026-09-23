"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionStateMachine = void 0;
const types_1 = require("./types");
class ConnectionStateMachine {
    currentState = 'DISCONNECTED';
    listeners = new Set();
    transitionLock = Promise.resolve();
    connection;
    logger;
    constructor(connection, logger = new types_1.DefaultLogger()) {
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
    setConnection(connection) {
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
    getState() {
        return this.currentState;
    }
    onTransition(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
    /**
     * Thread-safe / lock-protected state transition
     */
    async transitionTo(to, reason) {
        const nextLock = this.transitionLock.then(async () => {
            const from = this.currentState;
            if (from === to) {
                return;
            }
            this.currentState = to;
            const event = {
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
                }
                catch (listenerErr) {
                    this.logger.error('Error in transition listener', { listenerErr });
                }
            }
        });
        this.transitionLock = nextLock.catch(() => { });
        return nextLock;
    }
    /**
     * Handles write failure/timeout:
     * Transitions to RECONNECTING -> attempts one reconnect -> CONNECTED or DISCONNECTED.
     */
    async handleWriteFailure(reason) {
        await this.transitionTo('RECONNECTING', reason);
        if (!this.connection) {
            await this.transitionTo('DISCONNECTED', 'No connection available to reconnect');
            return false;
        }
        try {
            this.logger.info('Attempting single automatic reconnect after failure');
            await this.connection.disconnect().catch(() => { });
            await this.connection.connect();
            await this.transitionTo('CONNECTED', 'Reconnected successfully');
            return true;
        }
        catch (reconnectErr) {
            const failReason = reconnectErr instanceof Error ? reconnectErr.message : String(reconnectErr);
            this.logger.warn(`Reconnect attempt failed: ${failReason}`);
            await this.transitionTo('DISCONNECTED', `Reconnect failed: ${failReason}`);
            return false;
        }
    }
}
exports.ConnectionStateMachine = ConnectionStateMachine;
//# sourceMappingURL=state-machine.js.map