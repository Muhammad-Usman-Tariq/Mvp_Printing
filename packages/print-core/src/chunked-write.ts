import { PrinterConnection } from './types';

export interface ChunkedWriteOptions {
  chunkSize?: number;
  delayMs?: number;
}

export async function chunkedWrite(
  connection: PrinterConnection,
  data: Uint8Array,
  options: ChunkedWriteOptions = {}
): Promise<void> {
  const { chunkSize = 64, delayMs = 15 } = options;

  if (chunkSize <= 0) {
    throw new Error('chunkSize must be greater than 0');
  }

  let offset = 0;
  while (offset < data.length) {
    const end = Math.min(offset + chunkSize, data.length);
    const chunk = data.subarray(offset, end);

    await connection.write(chunk);
    offset = end;

    if (offset < data.length && delayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
