import {
  JobStore,
  PrintJob,
  DeviceId,
  JobStatus,
  PrintErrorType
} from '@printer-mvp/print-core';

export class SqliteJobStore implements JobStore {
  private db: any;

  constructor(dbPath: string = 'local-print-jobs.db') {
    try {
      // Node 22/24 built-in native SQLite (zero native compiler dependencies)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DatabaseSync } = require('node:sqlite');
      this.db = new DatabaseSync(dbPath);
    } catch {
      // Fallback for older Node environments with better-sqlite3
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Database = require('better-sqlite3');
      this.db = new Database(dbPath);
    }

    this.init();
  }

  private init(): void {
    try {
      this.db.exec('PRAGMA journal_mode = WAL;');
    } catch {}

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS print_jobs (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        last_error TEXT,
        last_error_type TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  async save(job: PrintJob): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO print_jobs (
        id, device_id, payload, status, attempts, max_attempts,
        last_error, last_error_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        device_id = excluded.device_id,
        payload = excluded.payload,
        status = excluded.status,
        attempts = excluded.attempts,
        max_attempts = excluded.max_attempts,
        last_error = excluded.last_error,
        last_error_type = excluded.last_error_type,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      job.id,
      job.deviceId,
      job.payload,
      job.status,
      job.attempts,
      job.maxAttempts,
      job.lastError ?? null,
      job.lastErrorType ?? null,
      job.createdAt,
      job.updatedAt
    );
  }

  async getNextQueued(): Promise<PrintJob | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM print_jobs 
      WHERE status = 'queued' 
      ORDER BY created_at ASC 
      LIMIT 1
    `);

    const row = stmt.get() as Record<string, unknown> | undefined;
    return row ? this.rowToJob(row) : null;
  }

  async getAll(): Promise<PrintJob[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM print_jobs 
      ORDER BY created_at DESC
    `);

    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map((r) => this.rowToJob(r));
  }

  async getIncomplete(): Promise<PrintJob[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM print_jobs 
      WHERE status IN ('queued', 'sending') 
      ORDER BY created_at ASC
    `);

    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map((r) => this.rowToJob(r));
  }

  close(): void {
    if (this.db && typeof this.db.close === 'function') {
      try {
        this.db.close();
      } catch {}
    }
  }

  private rowToJob(row: Record<string, unknown>): PrintJob {
    return {
      id: String(row.id),
      deviceId: String(row.device_id) as DeviceId,
      payload: String(row.payload),
      status: String(row.status) as JobStatus,
      attempts: Number(row.attempts),
      maxAttempts: Number(row.max_attempts),
      lastError: row.last_error ? String(row.last_error) : undefined,
      lastErrorType: row.last_error_type
        ? (String(row.last_error_type) as PrintErrorType)
        : undefined,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    };
  }
}
