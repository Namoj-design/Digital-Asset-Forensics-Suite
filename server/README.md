# DAFS Forensics API (PostgreSQL)

Production-style REST API for **Namo Labs | Digital Asset Forensics Suite**: modular Express server with PostgreSQL as the source of truth (no in-memory mock data).

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Database setup

Use a **dedicated database** (recommended name: `dafs_forensics`). The legacy `backend/` app may use different `cases` / `users` shapes; mixing schemas on the same database can cause conflicts.

```bash
createdb dafs_forensics
```

Copy environment variables:

```bash
cp server/.env.example .env
# Edit .env — at minimum set FORENSICS_DATABASE_URL or DATABASE_URL
```

Run migrations (creates `users`, `cases`, `addresses`, `transactions`, `evidence` with indexes on `address`, `tx_hash`, and supporting indexes):

```bash
npm run forensics:migrate
```

Load investigator sample data (2 users, 2 cases, 10 transactions, 5 auto-managed addresses):

```bash
npm run forensics:seed
```

To wipe only the MVP tables on a dev database (destructive):

```bash
psql "$FORENSICS_DATABASE_URL" -f server/db/reset-dev.sql
npm run forensics:migrate
```

## Run the server

```bash
npm run dev:forensics
```

Default URL: `http://localhost:4000` (override with `FORENSICS_PORT`).

Health check: `GET /health`

Uploaded files are stored under `server/uploads/` and exposed read-only at `GET /uploads/<filename>`.

## API reference

| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Body: `{ "email", "password" }`. User must exist. Dev default password: `password` unless `DEMO_PASSWORD` is set. Production requires `DEMO_PASSWORD`. |
| POST | `/cases` | Create case. Body: `title`, `description?`, `chain`, `status?`, `created_by` (user id). |
| GET | `/cases` | List cases. Query: `page`, `limit`, `chain`, `status`. |
| GET | `/cases/:id` | Case detail (includes creator name/email). |
| PUT | `/cases/:id` | Partial update: `title`, `description`, `chain`, `status`. |
| DELETE | `/cases/:id` | Delete case (cascades evidence). |
| POST | `/transactions` | Insert tx; auto-creates `from` / `to` addresses; refreshes `risk_score = 2 × tx_count` per address. |
| GET | `/transactions/:address` | All txs where wallet is sender or receiver. Query: `chain` (optional). |
| GET | `/graph/:address` | Graph JSON for forensics UI. Query: `chain` (optional; required if txs span multiple chains). |
| POST | `/upload` | `multipart/form-data`: field `file` (PDF/image), field `case_id`. |
| GET | `/evidence/:case_id` | List evidence rows for a case. |
| GET | `/addresses` | **Bonus:** `min_risk` (required), optional `chain`, `limit`, `offset`. |

### Graph response shape

```json
{
  "nodes": [{ "id": "0x...", "label": "wallet", "risk_score": 4 }],
  "edges": [{ "from": "0x...", "to": "0x...", "value": "1.5", "tx_hash": "0x..." }]
}
```

## Example requests

Replace port if needed.

```bash
# Login (after seed)
curl -s -X POST http://localhost:4000/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"investigator@dafs.local","password":"password"}'

# Cases (paginated, filter by chain)
curl -s 'http://localhost:4000/cases?page=1&limit=10&chain=ethereum'

# Transactions for a seeded wallet
curl -s 'http://localhost:4000/transactions/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa?chain=ethereum'

# Graph
curl -s 'http://localhost:4000/graph/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa?chain=ethereum'

# Addresses over risk threshold (bonus)
curl -s 'http://localhost:4000/addresses?min_risk=4&chain=ethereum'

# Upload evidence for case id 1 (must be .pdf or image extension)
curl -s -X POST http://localhost:4000/upload \
  -F 'case_id=1' \
  -F 'file=@/path/to/report.pdf'
```

## Architecture

```
server/
  config/       # env, db pool, multer
  controllers/  # HTTP adapters
  routes/       # Express routers
  services/     # Business logic + SQL (parameterized)
  middlewares/  # errors, sanitization
  models/       # shared constants
  db/           # schema.sql, reset-dev.sql
  scripts/      # migrate, seed
  uploads/      # evidence binary storage
  server.js
```

## Security notes

- All SQL uses parameterized queries (`$1`, `$2`, …).
- Request bodies are lightly sanitized (trim, strip null bytes).
- Configure `DEMO_PASSWORD` before any production deployment; treat this as a placeholder until you integrate real auth.
