export interface SanitizeOptions {
    strict?: boolean;
    initPrinter?: boolean;
    feedLines?: number;
    cutPaper?: boolean;
}
/**
 * Strips or converts characters outside the thermal printer's code page (CP437 / printable ASCII).
 * Throws an Error with 'unsupported content' message if strict mode is enabled and invalid characters are found.
 */
export declare function sanitizeForPrinter(payload: string, options?: SanitizeOptions): Uint8Array;
//# sourceMappingURL=sanitizer.d.ts.map