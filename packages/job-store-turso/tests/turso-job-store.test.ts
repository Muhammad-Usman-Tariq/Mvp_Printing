import { TursoJobStore } from '../src/turso-job-store';
import { PrintJob } from '@printer-mvp/print-core';
import * as fs from 'fs';
import * as path from 'path';

describe('TursoJobStore', () => {
  const testDbFile = path.join(__dirname, 'test-turso.db');
  let store: TursoJobStore;

  beforeEach(async () => {
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
    store = new TursoJobStore({
      localDbUrl: `file:${testDbFile}`,
      syncInterval: 0 // disable auto interval for unit tests
    });
    await store.init();
    // Clean table between tests
    const client = (store as any).client;
    await client.execute('DELETE FROM print_jobs');
  });

  afterEach(() => {
    store.close();
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
  });

  test('should insert and retrieve print jobs', async () => {
    const job: PrintJob = {
      id: 'job-1',
      deviceId: 'mobile',
      payload: 'Test receipt 1',
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      createdAt: 1000,
      updatedAt: 1000
    };

    await store.save(job);

    const queued = await store.getNextQueued();
    expect(queued).not.toBeNull();
    expect(queued?.id).toBe('job-1');
    expect(queued?.deviceId).toBe('mobile');
    expect(queued?.payload).toBe('Test receipt 1');
    expect(queued?.status).toBe('queued');
  });

  test('should update existing job on conflict', async () => {
    const job: PrintJob = {
      id: 'job-update',
      deviceId: 'desktop',
      payload: 'Update payload',
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      createdAt: 2000,
      updatedAt: 2000
    };

    await store.save(job);

    // Update job status to 'sent'
    job.status = 'sent';
    job.attempts = 1;
    job.updatedAt = 2500;
    await store.save(job);

    const all = await store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe('sent');
    expect(all[0].attempts).toBe(1);
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
      payload: 'Second',
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
