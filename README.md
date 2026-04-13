# Promo API

REST API for promo code management. Built with NestJS, TypeORM, PostgreSQL.

> **Time spent:** ~4.5 hours

## Stack

- **Runtime:** Node.js 22
- **Framework:** NestJS
- **ORM:** TypeORM
- **Database:** PostgreSQL
- **Validation:** class-validator + class-transformer
- **Linter/Formatter:** Biome

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/promo-codes` | Create a promo code |
| `GET` | `/promo-codes` | List all promo codes |
| `GET` | `/promo-codes/:code` | Get promo code by code |
| `POST` | `/promo-codes/:code/activate` | Activate promo code by email |

### Create promo code

```
POST /promo-codes
Content-Type: application/json

{
  "code": "SUMMER20",
  "discount": 20,
  "activationLimit": 100,
  "expiresAt": "2030-12-31T23:59:59.000Z"
}
```

**Fields:**
- `code` — string, 3–50 chars, unique
- `discount` — integer, 1–100 (percent)
- `activationLimit` — integer, min 1
- `expiresAt` — ISO 8601 date string

### Activate promo code

```
POST /promo-codes/SUMMER20/activate
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Business rules enforced:**
- Each email can activate a given promo code only once → `409 Conflict`
- Cannot activate beyond the limit → `409 Conflict`
- Cannot activate an expired code → `409 Conflict`
- Concurrent activations are safe — the limit is enforced via pessimistic DB lock

## Running with Docker (recommended)

```bash
cp .env.example .env
docker compose up --build
```

API is available at `http://localhost:3000`.

## Running locally

### Prerequisites

- Node.js 22+
- PostgreSQL 17 running locally

```bash
cp .env.example .env
# Edit .env with your local DB credentials

npm install
npm run start:dev
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment name |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `promo` | PostgreSQL user |
| `DB_PASSWORD` | `promo_secret` | PostgreSQL password |
| `DB_NAME` | `promo_db` | PostgreSQL database name |
| `PORT` | `3000` | HTTP port |

> **Note:** `synchronize: true` (auto-creates tables) is enabled in `development` and `test`.  
> In `production` (`NODE_ENV=production`) it is disabled — manage schema via TypeORM migrations.

## Running tests

### Unit tests

```bash
npm test
```

### E2E tests

Require a running PostgreSQL instance (use `docker compose up postgres` or a local DB).

```bash
# With Docker postgres already running:
docker compose up postgres -d

# Point to your DB if needed:
DB_HOST=localhost DB_PORT=5432 DB_USER=promo DB_PASSWORD=promo_secret DB_NAME=promo_db \
  npm run test:e2e
```

### Lint

```bash
npm run lint
```

## Schema

### `promo_codes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `code` | citext | Unique |
| `discount` | smallint | 1–100 |
| `activation_limit` | integer | |
| `activation_count` | integer | Default 0 |
| `expires_at` | timestamptz | |
| `created_at` | timestamptz | Auto |

### `activations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `promo_code_id` | UUID | FK → promo_codes |
| `email` | citext | |
| `activated_at` | timestamptz | Auto |

Unique constraint: `(promo_code_id, email)`