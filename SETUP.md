# Setup & Environment Configuration

## Turso Database Credentials

1. Copy `.env.example` to `.env` in each package (`mobile-app`, `desktop-app`, `dashboard`):
   ```bash
   cp .env.example .env
   ```
2. Fill in your own Turso database URL and authentication token in `.env`:
   ```env
   TURSO_DATABASE_URL=libsql://your-database-name.turso.io
   TURSO_AUTH_TOKEN=your-auth-token-here
   ```
3. **NEVER commit `.env` files**: All `.env` and `.env.*` files are explicitly excluded via `.gitignore` to prevent leaking credentials to version control.
