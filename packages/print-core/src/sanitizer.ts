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
export function sanitizeForPrinter(
  payload: string,
  options: SanitizeOptions = {}
): Uint8Array {
  const { strict = false, initPrinter = true, feedLines = 3, cutPaper = false } = options;

  if (payload === undefined || payload === null) {
    throw new Error('Unsupported content: payload cannot be null or undefined');
  }

  // Check for unprintable control characters (excluding newline, carriage return, tab)
  const forbiddenControlRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
  if (strict && forbiddenControlRegex.test(payload)) {
    throw new Error(`Unsupported content: contains invalid control characters`);
  }

  const bytes: number[] = [];

  // ESC @ - Initialize printer
  if (initPrinter) {
    bytes.push(0x1b, 0x40);
  }

  // Process characters
  for (let i = 0; i < payload.length; i++) {
    const char = payload[i];
    const code = payload.charCodeAt(i);

    // Standard ASCII linebreaks and tab
    if (code === 0x0a || code === 0x0d || code === 0x09) {
      bytes.push(code);
      continue;
    }

    // Skip forbidden control chars if not strict
    if (code < 0x20 || code === 0x7f) {
      continue;
    }

    // Printable ASCII: 0x20 (space) to 0x7E (~)
    if (code >= 0x20 && code <= 0x7e) {
      bytes.push(code);
      continue;
    }

    // High Unicode / Extended characters
    if (strict) {
      throw new Error(`Unsupported content: character '${char}' (U+${code.toString(16).toUpperCase()}) outside printer code page`);
    }

    // Common replacements for CP437 compatibility
    if (code === 0x2018 || code === 0x2019) {
      bytes.push(0x27); // '
    } else if (code === 0x201c || code === 0x201d) {
      bytes.push(0x22); // "
    } else if (code === 0x2013 || code === 0x2014) {
      bytes.push(0x2d); // -
    } else if (code === 0x2026) {
      bytes.push(0x2e, 0x2e, 0x2e); // ...
    } else if (code <= 0xff) {
      // 8-bit extended ascii
      bytes.push(code);
    } else {
      // Fallback placeholder
      bytes.push(0x3f); // '?'
    }
  }

  // Ensure trailing newline
  if (bytes.length > 0 && bytes[bytes.length - 1] !== 0x0a) {
    bytes.push(0x0a);
  }

  // Paper feed
  for (let f = 0; f < feedLines; f++) {
    bytes.push(0x0a);
  }

  // GS V 65 0 - Paper cut (partial cut)
  if (cutPaper) {
    bytes.push(0x1d, 0x56, 0x41, 0x00);
  }

  return new Uint8Array(bytes);
}
