import { Client, createClient, Config as LibsqlConfig } from '@libsql/client';
import { JobStore, PrintJob, PrintErrorType, DeviceId, JobStatus, Logger, DefaultLogger } from '@printer-mvp/print-core';

export interface TursoJobStoreOptions {
  localDbUrl?: string; // default 'file:local-print-jobs.db'
  syncUrl?: string;
  authToken?: string;
  syncInterval?: number; // seconds, default 60
  logger?: Logger;
}

export class TursoJobStore implements JobStore {
  private client: Client;
  private logger: Logger;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private lastSyncTime: number | null = null;
  private syncIntervalHandle: NodeJS.Timeout | null = null;
  private isSyncing = false;

  private syncUrl?: string;

  constructor(options: TursoJobStoreOptions = {}) {
    const {
      localDbUrl = 'file:local-print-jobs.db',
      syncUrl = process.env.TURSO_DATABASE_URL,
      authToken = process.env.TURSO_AUTH_TOKEN,
      syncInterval = 60,
      logger = new DefaultLogger()
    } = options;

    this.logger = logger;
    this.syncUrl = syncUrl;

    const clientConfig: LibsqlConfig = {
      url: localDbUrl
    };

    // If remote Turso sync credentials provided, enable embedded replica mode
    if (syncUrl) {
      clientConfig.syncUrl = syncUrl;
      clientConfig.authToken = authToken;
      clientConfig.syncInterval = syncInterval;
      this.logger.info('Configured Turso embedded replica mode', { localDbUrl, syncUrl });
    } else {
      this.logger.info('Operating in local-first SQLite file mode (no syncUrl provided)', { localDbUrl });
    }

    this.client = createClient(clientConfig);

    // Start background sync timer if syncUrl is set
    if (syncUrl && syncInterval > 0) {
      this.syncIntervalHandle = setInterval(() => {
        this.triggerBackgroundSync().catch(() => {});
      }, syncInterval * 1000);
    }
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      // First sync down any tables from Turso if replica
      if (this.syncUrl) {
        try {
          if (typeof this.client.sync === 'function') {
            await this.client.sync();
            this.lastSyncTime = Date.now();
          }
        } catch (syncErr) {
          this.logger.warn('Initial sync skipped or failed (offline?): ' + String(syncErr));
        }
      }

      // Ensure table exists locally
      await this.client.execute(`
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

      this.isInitialized = true;
      this.logger.info('TursoJobStore schema verified');
    })();

    return this.initPromise;
  }

  public async save(job: PrintJob): Promise<void> {
    await this.init();

    await this.client.execute({
      sql: `
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
      `,
      args: [
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
      ]
    });

    // Fire-and-forget background sync (never blocks local write)
    this.triggerBackgroundSync().catch(() => {});
  }

  public async getNextQueued(): Promise<PrintJob | null> {
    await this.init();

    const result = await this.client.execute({
      sql: `
        SELECT * FROM print_jobs 
        WHERE status = 'queued' 
        ORDER BY created_at ASC 
        LIMIT 1
      `,
      args: []
    });

    if (result.rows.length === 0) return null;
    return this.rowToJob(result.rows[0]);
  }

  public async getAll(): Promise<PrintJob[]> {
    await this.init();

    const result = await this.client.execute({
      sql: `SELECT * FROM print_jobs ORDER BY created_at DESC`,
      args: []
    });

    return result.rows.map((r) => this.rowToJob(r));
  }

  public async getIncomplete(): Promise<PrintJob[]> {
    await this.init();

    const result = await this.client.execute({
      sql: `
        SELECT * FROM print_jobs 
        WHERE status IN ('queued', 'sending') 
        ORDER BY created_at ASC
      `,
      args: []
    });

    return result.rows.map((r) => this.rowToJob(r));
  }

  public async triggerBackgroundSync(): Promise<void> {
    if (!this.syncUrl) return;
    if (this.isSyncing) return;
    if (typeof this.client.sync !== 'function') return;

    this.isSyncing = true;
    try {
      await this.client.sync();
      this.lastSyncTime = Date.now();
      this.logger.debug('Turso embedded replica sync completed', { timestamp: this.lastSyncTime });
    } catch (err) {
      this.logger.warn('Turso background sync deferred (network offline or sync error)', {
        error: String(err)
      });
    } finally {
      this.isSyncing = false;
    }
  }

  public getLastSyncTime(): number | null {
    return this.lastSyncTime;
  }

  public close(): void {
    if (this.syncIntervalHandle) {
      clearInterval(this.syncIntervalHandle);
      this.syncIntervalHandle = null;
    }
    this.client.close();
  }

  private rowToJob(row: Record<string, unknown> | unknown[]): PrintJob {
    // libSQL returns rows as either objects or arrays depending on driver
    const get = (col: string, index: number): unknown => {
      if (Array.isArray(row)) return row[index];
      return (row as Record<string, unknown>)[col];
    };

    return {
      id: String(get('id', 0)),
      deviceId: String(get('device_id', 1)) as DeviceId,
      payload: String(get('payload', 2)),
      status: String(get('status', 3)) as JobStatus,
      attempts: Number(get('attempts', 4)),
      maxAttempts: Number(get('max_attempts', 5)),
      lastError: get('last_error', 6) ? String(get('last_error', 6)) : undefined,
      lastErrorType: get('last_error_type', 7) ? (String(get('last_error_type', 7)) as PrintErrorType) : undefined,
      createdAt: Number(get('created_at', 8)),
      updatedAt: Number(get('updated_at', 9))
    };
  }
}
