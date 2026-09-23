import { ConnectionState, ConnectionTransitionEvent, PrinterConnection, Logger } from './types';
export type TransitionCallback = (event: ConnectionTransitionEvent) => void;
export declare class ConnectionStateMachine {
    private currentState;
    private listeners;
    private transitionLock;
    private connection?;
    private logger;
    constructor(connection?: PrinterConnection, logger?: Logger);
    setConnection(connection: PrinterConnection): void;
    getState(): ConnectionState;
    onTransition(callback: TransitionCallback): () => void;
    /**
     * Thread-safe / lock-protected state transition
     */
    transitionTo(to: ConnectionState, reason?: string): Promise<void>;
    /**
     * Handles write failure/timeout:
     * Transitions to RECONNECTING -> attempts one reconnect -> CONNECTED or DISCONNECTED.
     */
    handleWriteFailure(reason: string): Promise<boolean>;
}
//# sourceMappingURL=state-machine.d.ts.map