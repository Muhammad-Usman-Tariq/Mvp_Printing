import { SqliteJobStore } from '../src/sqlite-job-store';
import { PrintJob } from '@printer-mvp/print-core';

describe('SqliteJobStore', () => {
  let store: SqliteJobStore;

  beforeEach(() => {
    // In-memory SQLite for high-speed isolated unit testing
    store = new SqliteJobStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  test('should insert and retrieve print jobs in FIFO order', async () => {
    const job1: PrintJob = {
      id: 'job-1',
      deviceId: 'mobile',
      payload: 'Receipt 1',
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      createdAt: 1000,
      updatedAt: 1000
    };

    const job2: PrintJob = {
      id: 'job-2',
      deviceId: 'desktop',
      payload: 'Receipt 2',
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      createdAt: 2000,
      updatedAt: 2000
    };

    await store.save(job1);
    await store.save(job2);

    const next = await store.getNextQueued();
    expect(next).not.toBeNull();
    expect(next?.id).toBe('job-1');
    expect(next?.deviceId).toBe('mobile');
    expect(next?.payload).toBe('Receipt 1');
    expect(next?.status).toBe('queued');
  });

  test('should update existing job on conflict', async () => {
    const job: PrintJob = {
      id: 'job-update',
      deviceId: 'desktop',
      payload: 'Original content',
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      createdAt: 2000,
      updatedAt: 2000
    };

    await store.save(job);

    // Update job status to sent
    job.status = 'sent';
    job.attempts = 1;
    job.updatedAt = 2500;
    await store.save(job);

    const all = await store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe('sent');
    expect(all[0].attempts).toBe(1);
    expect(all[0].updatedAt).toBe(2500);
  });

  test('should return incomplete jobs (queued or sending) sorted by createdAt ASC', async () => {
    const job1: PrintJob = {
      id: 'j-1',
      deviceId: 'mobile',
      payload: 'First',
      status: 'sending',
      attempts: 1,
      maxAttempts: 3,
      createdAt: 100,
      updatedAt: 150
    };
    const job2: PrintJob = {
      id: 'j-2',
      deviceId: 'desktop',
      payload: 'Second (Sent)',
      status: 'sent',
      attempts: 1,
      maxAttempts: 3,
      createdAt: 200,
      updatedAt: 250
    };
    const job3: PrintJob = {
      id: 'j-3',
      deviceId: 'mobile',
      payload: 'Third',
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      createdAt: 300,
      updatedAt: 300
    };

    await store.save(job1);
    await store.save(job2);
    await store.save(job3);

    const incomplete = await store.getIncomplete();
    expect(incomplete.map((j) => j.id)).toEqual(['j-1', 'j-3']);
  });
});
