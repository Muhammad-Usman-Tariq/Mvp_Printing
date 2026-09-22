# Setup & Environment Configuration

> **Note:** This MVP currently uses local SQLite only for the print job queue. Turso/cloud sync will be added later as a manual step once the system is verified working end-to-end locally.

## Local Environment

1. The print job queue runs directly on a local SQLite database (`local-print-jobs.db`) managed by `@printer-mvp/job-store-sqlite`.
2. No cloud accounts, database URLs, or network tokens are required for local operation.
3. All `.db`, `.log`, and `.env` files are excluded in `.gitignore` to keep repositories completely clean.
