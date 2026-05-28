# fleet-tracker-backend

Real-time IoT fleet tracking backend. MQTT telemetry ingestion → InfluxDB storage → Socket.io broadcast to dashboard clients. Includes JWT auth with RBAC and a vehicle simulator for demo purposes.

> Companion repo: [`fleet-tracker-frontend`](https://github.com/skantechno/fleet-tracker-frontend)
> Live demo: _(add URL after deployment)_

## Stack

- **Node.js 20+** with TypeScript (strict)
- **Express 4** for REST
- **socket.io 4** for real-time broadcast
- **mqtt 5** subscribes to EMQX
- **InfluxDB 2.7** for time-series telemetry
- **PostgreSQL 16** for users, vehicles, geofences, alerts
- **drizzle-orm** for schema + migrations
- **jose** for JWT signing/verification
- **zod** for runtime validation

## Quick start

```bash
# 1. Start local services (from parent directory containing docker-compose.yml)
docker compose up -d

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env

# 4. Run migrations + seed
npm run db:migrate
npm run db:seed

# 5. Start backend
npm run dev

# 6. In a separate terminal, start the simulator
npm run simulator
```

Backend listens on `http://localhost:3000`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run simulator` | Publish fake telemetry for 5 vehicles |
| `npm run db:generate` | Generate a drizzle migration from the schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed 2 users + 5 vehicles |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run vitest |

## API

See [API_CONTRACT.md](./API_CONTRACT.md) for the full REST + Socket.io + MQTT specification shared with the frontend. All responses use a `{ success, data, meta? }` / `{ success, error }` envelope.

## Operations & hardening

- **Security headers** via `helmet`; **CORS** restricted to `CORS_ORIGIN`.
- **Rate limiting**: `/api/*` is capped at 120 requests/minute per IP (429 `RATE_LIMITED` on exceed).
- **Health**: `GET /health` reports live connectivity and returns `200` when all of Postgres, InfluxDB, and MQTT are connected, otherwise `503`:
  ```json
  { "success": true, "data": { "status": "ok",
    "services": { "postgres": "connected", "influx": "connected", "mqtt": "connected" } } }
  ```
- **Graceful shutdown**: on `SIGINT`/`SIGTERM` the process closes MQTT, flushes & closes the InfluxDB writer, closes Socket.io and the HTTP server, then drains the Postgres pool.

## Seed credentials

| Email | Password | Role |
|---|---|---|
| admin@demo.com | admin123 | admin |
| dispatcher@demo.com | dispatcher123 | dispatcher |

## Project structure

See `CLAUDE.md` for the full architecture and contribution conventions.
