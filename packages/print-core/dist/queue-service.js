"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrintQueueService = void 0;
exports.generateJobId = generateJobId;
const types_1 = require("./types");
const sanitizer_1 = require("./sanitizer");
const chunked_write_1 = require("./chunked-write");
function generateJobId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'job-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}
class PrintQueueService {
    connection;
    stateMachine;
    jobStore;
    logger;
    config;
    isWorkerRunning = false;
    currentJob = null;
    nextRunTimeout = null;
    constructor(connection, stateMachine, jobStore, config = {}, logger = new types_1.DefaultLogger()) {
        this.connection = connection;
        this.stateMachine = stateMachine;
        this.jobStore = jobStore;
        this.logger = logger;
        this.config = {
            writeTimeoutMs: config.writeTimeoutMs ?? 5000,
            maxAttempts: config.maxAttempts ?? 3,
            baseBackoffMs: config.baseBackoffMs ?? 1000,
            maxBackoffMs: config.maxBackoffMs ?? 8000,
            onJobComplete: config.onJobComplete ?? (() => { }),
            onJobStatusChange: config.onJobStatusChange ?? (() => { })
        };
    }
    isBusy() {
        return this.isWorkerRunning || this.currentJob !== null;
    }
    getCurrentJob() {
        return this.currentJob;
    }
    /**
     * Enqueue a new print job.
     */
    async enqueue(payload, deviceId, maxAttempts = this.config.maxAttempts) {
        const now = Date.now();
        const job = {
            id: generateJobId(),
            deviceId,
            payload,
            status: 'queued',
            attempts: 0,
            maxAttempts,
            createdAt: now,
            updatedAt: now
        };
        await this.jobStore.save(job);
        this.logger.info(`Job enqueued: ${job.id}`, { jobId: job.id, deviceId, payloadLength: payload ? payload.length : 0 });
        this.config.onJobStatusChange(job);
        this.triggerWorker();
        return job;
    }
    /**
     * Startup recovery: resets any lingering 'sending' jobs back to 'queued'
     * and triggers the worker loop.
     */
    async resumeIncomplete() {
        this.logger.info('Resuming incomplete print jobs on startup...');
        const incompleteJobs = await this.jobStore.getIncomplete();
        for (const job of incompleteJobs) {
            if (job.status === 'sending') {
                this.logger.warn(`Recovering job ${job.id} interrupted mid-print; resetting to queued`);
                job.status = 'queued';
                job.updatedAt = Date.now();
                await this.jobStore.save(job);
                this.config.onJobStatusChange(job);
            }
        }
        this.triggerWorker();
    }
    triggerWorker() {
        if (this.isWorkerRunning) {
            return;
        }
        this.isWorkerRunning = true;
        this.processQueueLoop()
            .catch((err) => {
            this.logger.error('Unhandled error in print queue worker loop', { err });
        })
            .finally(() => {
            this.isWorkerRunning = false;
        });
    }
    async processQueueLoop() {
        while (true) {
            const job = await this.jobStore.getNextQueued();
            if (!job) {
                break;
            }
            this.currentJob = job;
            await this.processSingleJob(job);
            this.currentJob = null;
        }
    }
    async processSingleJob(job) {
        this.logger.info(`Starting execution of job ${job.id} (attempt ${job.attempts + 1}/${job.maxAttempts})`);
        // Transition job to sending
        job.status = 'sending';
        job.updatedAt = Date.now();
        await this.jobStore.save(job);
        this.config.onJobStatusChange(job);
        // Sanitize and encode payload first
        let sanitizedBytes;
        try {
            sanitizedBytes = (0, sanitizer_1.sanitizeForPrinter)(job.payload, { strict: false });
        }
        catch (err) {
            // Non-retryable content error
            const errorMsg = err instanceof Error ? err.message : String(err);
            job.status = 'failed';
            job.attempts += 1;
            job.lastError = errorMsg;
            job.lastErrorType = types_1.PrintErrorType.UNSUPPORTED_CONTENT;
            job.updatedAt = Date.now();
            await this.jobStore.save(job);
            this.logger.error(`Job ${job.id} failed immediately due to unsupported content`, { errorMsg });
            this.config.onJobStatusChange(job);
            this.config.onJobComplete(job);
            return;
        }
        // Ensure connection is active
        try {
            await this.ensureConnected();
        }
        catch (connErr) {
            await this.handleJobFailure(job, connErr);
            return;
        }
        // Mark state machine as PRINTING
        await this.stateMachine.transitionTo('PRINTING', `Printing job ${job.id}`);
        // Execute write with timeout race
        try {
            await this.writeWithTimeout(sanitizedBytes, this.config.writeTimeoutMs);
            // Write succeeded!
            job.status = 'sent';
            job.attempts += 1;
            job.updatedAt = Date.now();
            await this.jobStore.save(job);
            await this.stateMachine.transitionTo('CONNECTED', 'Print job completed successfully');
            this.logger.info(`Job ${job.id} printed successfully`);
            this.config.onJobStatusChange(job);
            this.config.onJobComplete(job);
        }
        catch (writeErr) {
            await this.handleJobFailure(job, writeErr);
        }
    }
    async ensureConnected() {
        const currentState = this.stateMachine.getState();
        if (currentState === 'CONNECTED' || currentState === 'PRINTING') {
            return;
        }
        this.logger.info(`Connecting to printer (current state: ${currentState})...`);
        await this.stateMachine.transitionTo('CONNECTING', 'Initiating connection for print job');
        try {
            await this.connection.connect();
            await this.stateMachine.transitionTo('CONNECTED', 'Connected to printer');
        }
        catch (err) {
            await this.stateMachine.transitionTo('DISCONNECTED', `Connection failed: ${err}`);
            throw err;
        }
    }
    async writeWithTimeout(bytes, timeoutMs) {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => {
                reject(new Error(`Write operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });
        try {
            await Promise.race([(0, chunked_write_1.chunkedWrite)(this.connection, bytes), timeoutPromise]);
        }
        finally {
            clearTimeout(timer);
        }
    }
    async handleJobFailure(job, error) {
        job.attempts += 1;
        const errorType = (0, types_1.classifyError)(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        job.lastError = errorMessage;
        job.lastErrorType = errorType;
        job.updatedAt = Date.now();
        this.logger.warn(`Job ${job.id} failed on attempt ${job.attempts}/${job.maxAttempts}: [${errorType}] ${errorMessage}`);
        // Trigger state machine write failure recovery
        await this.stateMachine.handleWriteFailure(errorMessage);
        const isNonRetryable = errorType === types_1.PrintErrorType.UNSUPPORTED_CONTENT;
        const isExhausted = job.attempts >= job.maxAttempts;
        if (isNonRetryable || isExhausted) {
            job.status = 'failed';
            await this.jobStore.save(job);
            this.logger.error(`Job ${job.id} permanently failed after ${job.attempts} attempts`);
            this.config.onJobStatusChange(job);
            this.config.onJobComplete(job);
        }
        else {
            // Re-queue for retry
            job.status = 'queued';
            await this.jobStore.save(job);
            this.config.onJobStatusChange(job);
            // Exponential backoff: Math.min(1000 * 2 ** attempts, 8000)
            const backoffMs = Math.min(this.config.baseBackoffMs * Math.pow(2, job.attempts - 1), this.config.maxBackoffMs);
            this.logger.info(`Scheduling retry for job ${job.id} after backoff: ${backoffMs}ms`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
    }
}
exports.PrintQueueService = PrintQueueService;
//# sourceMappingURL=queue-service.js.map