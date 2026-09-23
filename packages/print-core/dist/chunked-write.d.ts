import { PrinterConnection } from './types';
export interface ChunkedWriteOptions {
    chunkSize?: number;
    delayMs?: number;
}
export declare function chunkedWrite(connection: PrinterConnection, data: Uint8Array, options?: ChunkedWriteOptions): Promise<void>;
//# sourceMappingURL=chunked-write.d.ts.map