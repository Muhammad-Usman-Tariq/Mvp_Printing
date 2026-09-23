"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkedWrite = chunkedWrite;
async function chunkedWrite(connection, data, options = {}) {
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
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
}
//# sourceMappingURL=chunked-write.js.map