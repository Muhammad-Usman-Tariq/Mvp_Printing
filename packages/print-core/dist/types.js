"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultLogger = exports.PrintErrorType = void 0;
exports.classifyError = classifyError;
exports.toFriendlyErrorMessage = toFriendlyErrorMessage;
var PrintErrorType;
(function (PrintErrorType) {
    PrintErrorType["CONNECTION_LOST"] = "CONNECTION_LOST";
    PrintErrorType["TIMEOUT"] = "TIMEOUT";
    PrintErrorType["DEVICE_BUSY"] = "DEVICE_BUSY";
    PrintErrorType["UNSUPPORTED_CONTENT"] = "UNSUPPORTED_CONTENT";
    PrintErrorType["UNKNOWN"] = "UNKNOWN";
})(PrintErrorType || (exports.PrintErrorType = PrintErrorType = {}));
class DefaultLogger {
    info(msg, meta) {
        console.info(`[INFO] ${msg}`, meta ? JSON.stringify(meta) : '');
    }
    warn(msg, meta) {
        console.warn(`[WARN] ${msg}`, meta ? JSON.stringify(meta) : '');
    }
    error(msg, meta) {
        console.error(`[ERROR] ${msg}`, meta ? JSON.stringify(meta) : '');
    }
    debug(msg, meta) {
        // Silent by default in standard runs
    }
}
exports.DefaultLogger = DefaultLogger;
function classifyError(err) {
    if (!err)
        return PrintErrorType.UNKNOWN;
    if (typeof err === 'object' && err !== null && 'type' in err) {
        const errorWithType = err;
        if (Object.values(PrintErrorType).includes(errorWithType.type)) {
            return errorWithType.type;
        }
    }
    const message = err instanceof Error ? err.message : String(err);
    const normalized = message.toLowerCase();
    if (normalized.includes('unsupported') ||
        normalized.includes('invalid character') ||
        normalized.includes('encoding') ||
        normalized.includes('code page')) {
        return PrintErrorType.UNSUPPORTED_CONTENT;
    }
    if (normalized.includes('timeout') ||
        normalized.includes('timed out') ||
        normalized.includes('deadline exceeded')) {
        return PrintErrorType.TIMEOUT;
    }
    if (normalized.includes('busy') ||
        normalized.includes('device_busy') ||
        normalized.includes('locked') ||
        normalized.includes('resource in use')) {
        return PrintErrorType.DEVICE_BUSY;
    }
    if (normalized.includes('connection lost') ||
        normalized.includes('disconnected') ||
        normalized.includes('closed') ||
        normalized.includes('econnreset') ||
        normalized.includes('broken pipe') ||
        normalized.includes('device not reachable') ||
        normalized.includes('bluetooth')) {
        return PrintErrorType.CONNECTION_LOST;
    }
    return PrintErrorType.UNKNOWN;
}
function toFriendlyErrorMessage(errorType, isFinal = false) {
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
//# sourceMappingURL=types.js.map