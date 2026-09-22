import { sanitizeForPrinter } from '../src/sanitizer';
import { chunkedWrite } from '../src/chunked-write';
import { FakePrinterConnection } from './fakes';

describe('Sanitizer and Chunked Writes', () => {
  describe('sanitizeForPrinter', () => {
    test('should encode printable ASCII characters with ESC/POS init and line feeds', () => {
      const text = 'Hello, Receipt!';
      const bytes = sanitizeForPrinter(text, { feedLines: 2 });

      // Starts with ESC @ (0x1B, 0x40)
      expect(bytes[0]).toBe(0x1b);
      expect(bytes[1]).toBe(0x40);

      // Contains "Hello, Receipt!"
      const decoded = new TextDecoder('ascii').decode(bytes);
      expect(decoded).toContain('Hello, Receipt!');

      // Has trailing newlines
      expect(bytes[bytes.length - 1]).toBe(0x0a);
    });

    test('should strip unprintable control characters in non-strict mode', () => {
      const dirty = 'Order #123\x00\x05\x07Total: $10';
      const bytes = sanitizeForPrinter(dirty, { strict: false });
      const decoded = new TextDecoder('ascii').decode(bytes);

      expect(decoded).toContain('Order #123Total: $10');
      expect(decoded).not.toContain('\x00');
      expect(decoded).not.toContain('\x05');
      expect(decoded).not.toContain('\x07');
    });

    test('should throw error in strict mode when unsupported control characters exist', () => {
      const dirty = 'Bad \x00 Byte';
      expect(() => {
        sanitizeForPrinter(dirty, { strict: true });
      }).toThrow(/unsupported content/i);
    });

    test('should map smart quotes and ellipsis gracefully', () => {
      const formatted = '“Special Offer”… ‘Only $5’';
      const bytes = sanitizeForPrinter(formatted, { strict: false });
      const decoded = new TextDecoder('ascii').decode(bytes);

      expect(decoded).toContain('"Special Offer"... \'Only $5\'');
    });
  });

  describe('chunkedWrite', () => {
    test('should split payload into exact chunk sizes with delay and preserve all bytes', async () => {
      const fakeConn = new FakePrinterConnection();
      await fakeConn.connect();

      // 150 bytes payload
      const testData = new Uint8Array(150);
      for (let i = 0; i < 150; i++) {
        testData[i] = i % 256;
      }

      const chunkSize = 64;
      await chunkedWrite(fakeConn, testData, { chunkSize, delayMs: 5 });

      // Should produce 3 chunks: 64, 64, 22
      expect(fakeConn.writtenChunks).toHaveLength(3);
      expect(fakeConn.writtenChunks[0].length).toBe(64);
      expect(fakeConn.writtenChunks[1].length).toBe(64);
      expect(fakeConn.writtenChunks[2].length).toBe(22);

      const assembled = fakeConn.getAllWrittenBytes();
      expect(assembled).toEqual(testData);
    });
  });
});
