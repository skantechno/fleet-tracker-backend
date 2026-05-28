# Fleet Tracker Backend — Claude Code Context

This file gives Claude Code the context to build and maintain this project. **Always read `API_CONTRACT.md` first** — it is the source of truth that both this repo and the frontend repo follow. Then read `CONTRIBUTING.md` for the branching and commit workflow you must follow.

---

## What this service does

A Node.js + TypeScript backend that:

1. **Subscribes to MQTT** topic `vehicles/+/telemetry` and writes incoming messages to InfluxDB
2. **Detects alerts** in real time (speed violations, geofence exits, low fuel)
3. **Broadcasts updates** to connected frontend clients via Socket.io
4. **Serves a REST API** for auth, vehicles, history, alerts, and geofences
5. **Runs a vehicle simulator** (separate script) that publishes fake MQTT telemetry for 5 vehicles in Hyderabad, Pakistan

---

## Tech stack (use these exactly)

| Concern | Library |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript (strict mode) |
| HTTP | Express 4 |
| Realtime | socket.io 4 |
| MQTT client | mqtt 5 |
| InfluxDB client | @influxdata/influxdb-client |
| Postgres | pg (node-postgres) + drizzle-orm (for migrations + types) |
| JWT | jose |
| Password hashing | bcrypt |
| Validation | zod |
| Env vars | dotenv |
| Logging | pino + pino-pretty (dev) |
| Dev runner | tsx watch |
| Tests | vitest |

**Do not introduce new dependencies without asking the user.**

---

## Directory layout (target)

```
src/
  index.ts                 ← entrypoint, boots Express + Socket.io + MQTT subscriber
  config.ts                ← typed env loading via zod
  logger.ts                ← pino setup
  db/
    client.ts              ← pg pool + drizzle setup
    schema.ts              ← drizzle table definitions
    migrate.ts             ← migration runner
    seed.ts                ← inserts seed users + vehicles on first run
  influx/
    client.ts              ← InfluxDB client wrapper
    writer.ts              ← batched writer for telemetry
    queries.ts             ← Flux query builders (vehicle history)
  mqtt/
    client.ts              ← MQTT connect + subscribe
    handler.ts             ← processes incoming telemetry, calls writer + emits Socket.io
  realtime/
    server.ts              ← Socket.io setup + auth middleware
    emitter.ts             ← typed event emitters
  alerts/
    detector.ts            ← rules: speed_violation, geofence_exit, low_fuel
    geofence.ts            ← point-in-polygon helper
  routes/
    auth.ts                ← POST /login, GET /me
    vehicles.ts            ← GET /vehicles, GET /vehicles/:id, GET /vehicles/:id/history
    alerts.ts              ← GET /alerts, POST /alerts/:id/acknowledge
    geofences.ts           ← CRUD (admin only)
  middleware/
    auth.ts                ← JWT verification, attaches req.user
    rbac.ts                ← role-based access control
    error.ts               ← centralized error handler
  utils/
    jwt.ts                 ← sign + verify helpers using jose
simulator/
  index.ts                 ← publishes telemetry for 5 vehicles every 2s
  routes.ts                ← predefined GPS routes around Hyderabad, Pakistan
package.json
tsconfig.json
.env.example
.env                       ← gitignored
```

---

## Conventions

- **Strict TypeScript.** No `any`. Use `unknown` and narrow.
- **No default exports** except for the Express app and Socket.io server. Named exports everywhere else.
- **All env vars via `config.ts`**, validated with zod at startup. If validation fails, the process exits with a clear error.
- **All routes use a typed wrapper.** Errors thrown inside a route handler are caught by `middleware/error.ts`.
- **All Socket.io events typed** via a shared interface in `realtime/types.ts`. The frontend uses an identical type definition.
- **Don't log secrets.** Use `pino`'s `redact` config for `authorization`, `password`, `token`.
- **Use Flux, not InfluxQL.** Version 2.x bucket queries only.
- **Time always in UTC ISO 8601 strings** in API responses, `Date` objects internally.

---

## Git workflow (NON-NEGOTIABLE)

Read `CONTRIBUTING.md` for the full rules. The short version:

1. **NEVER commit directly to `main`** except for trivial doc-only changes.
2. **Every phase happens on its own branch** named `feat/phase-N-<slug>` or `chore/phase-N-<slug>`.
3. **Every phase ends with a Pull Request**, NOT a direct merge to main.
4. **Wait for the user's explicit "verified, merge it" confirmation** before merging the PR.
5. **Use Conventional Commits** for every commit: `feat(scope): subject`, `fix(scope): subject`, etc.
6. **Commit in small logical chunks** within a phase, not one giant commit at the end.

### Per-phase git ritual

```bash
# At phase start:
git checkout main && git pull origin main
git checkout -b <type>/phase-N-<slug>

# During phase: multiple small commits with conventional messages
git add <specific files>
git commit -m "feat(scope): clear subject"

# At phase end:
git push -u origin <branch>
gh pr create --title "Phase N — <name>" --body "<summary + verification output>"
# WAIT for user to confirm verification passed and say "merge it"
gh pr merge --squash --delete-branch
```

Mapping of phases to branch names is in `CONTRIBUTING.md`.

---

## Build phases (execute in order)

When the user gives you the initial prompt, execute these phases in order. **For each phase:**

1. Create the phase branch (per git ritual above)
2. Implement the phase
3. Commit in small logical chunks with conventional messages
4. Run the verification command at the end
5. Push the branch and open a PR
6. **PAUSE — do NOT merge.** Wait for the user to confirm the verification passed
7. Only after user says "merge it" → `gh pr merge --squash --delete-branch`
8. Return to main, await instruction for next phase

### Phase 1 — Project skeleton
Branch: `chore/phase-1-project-skeleton`
- Create `src/index.ts` with bare Express app listening on `:3000`
- Set up TypeScript config (`tsconfig.json` with strict mode) — already in place, verify
- Set up `pino` logger
- Set up env validation (`config.ts`)
- Add `npm run dev` (tsx watch) and `npm run build`
- **Verify:** `npm run dev` starts, `curl localhost:3000/health` returns `{"status":"ok"}`

### Phase 2 — Database layer
Branch: `feat/phase-2-database-layer`
- Add drizzle schema matching `API_CONTRACT.md` section 6
- Create migration script `npm run db:migrate`
- Create seed script `npm run db:seed` that inserts 2 users + 5 vehicles
- **Verify:** Run migrations + seed, then `psql` to inspect tables

### Phase 3 — Auth
Branch: `feat/phase-3-auth`
- Implement `POST /api/auth/login` and `GET /api/auth/me`
- JWT signing with HS256 (env-configured secret) using `jose`
- bcrypt password hashing
- Auth middleware that verifies and attaches `req.user`
- **Verify:** `curl -X POST localhost:3000/api/auth/login` with seed credentials returns token; using that token, `GET /api/auth/me` returns user

### Phase 4 — REST routes
Branch: `feat/phase-4-rest-routes`
- Implement `/api/vehicles`, `/api/vehicles/:id` (Postgres-backed)
- Implement RBAC (admin sees all, dispatcher sees only assigned vehicles)
- Implement `/api/geofences` CRUD (admin only)
- **Verify:** Curl each endpoint with admin and dispatcher tokens, confirm filtering works

### Phase 5 — InfluxDB writer + history query
Branch: `feat/phase-5-influx-writer`
- Connect to InfluxDB using env config
- Implement batched writer (flush every 1s or 100 points)
- Implement `GET /api/vehicles/:id/history` using Flux query
- **Verify:** Manually publish a test point, fetch via history endpoint

### Phase 6 — MQTT subscriber
Branch: `feat/phase-6-mqtt-subscriber`
- Connect to EMQX, subscribe to `vehicles/+/telemetry` and `vehicles/+/status`
- Parse + validate payloads with zod
- Write telemetry to InfluxDB via the writer
- **Verify:** Use `mosquitto_pub` to publish one message, see it appear in InfluxDB

### Phase 7 — Socket.io broadcast
Branch: `feat/phase-7-socketio-broadcast`
- Set up Socket.io with auth middleware (JWT in `auth` payload)
- Emit `vehicle:update` on each MQTT message arrival
- Emit `connection:status` on connect + status change
- **Verify:** Connect with a Socket.io client (use `wscat` or a small Node test script), see updates flowing

### Phase 8 — Alert detection
Branch: `feat/phase-8-alert-detection`
- Implement speed_violation rule (speed > 80 km/h)
- Implement geofence_exit rule (point-in-polygon)
- Implement low_fuel rule (fuel < 15%)
- Persist alerts to Postgres, emit `alert:new` over Socket.io
- Implement `GET /api/alerts` and `POST /api/alerts/:id/acknowledge`
- **Verify:** Publish a telemetry message with speed > 80, see alert in DB and via Socket.io

### Phase 9 — Vehicle simulator
Branch: `feat/phase-9-vehicle-simulator`
- `simulator/index.ts` publishes for 5 vehicles
- Predefined routes are loops around Hyderabad, Pakistan (5 different starting areas)
- Each tick (every 2s): advance vehicle along route, add small noise to speed/fuel, publish to MQTT
- Occasionally generate a speed violation (1 in 50 ticks) to demo alerts
- `npm run simulator` runs it
- **Verify:** Run simulator, see InfluxDB filling with data and Socket.io clients receiving updates

### Phase 10 — Hardening
Branch: `chore/phase-10-hardening`
- Helmet, CORS (whitelist frontend origin from env)
- Request rate limiting (express-rate-limit)
- Graceful shutdown (close MQTT, InfluxDB, Socket.io, HTTP server in order)
- Health endpoint reports MQTT + InfluxDB + Postgres connectivity
- README with run instructions

---

## Things to NOT do

- Don't add a frontend folder here — that's a separate repo
- Don't add ORMs other than drizzle (no Prisma, no TypeORM)
- Don't use callbacks where async/await works
- Don't commit `.env` (already in `.gitignore`)
- Don't commit directly to `main` — always work on a phase branch
- Don't merge a PR on your own initiative — wait for user confirmation
- Don't add Docker support for the app itself yet (we'll add `Dockerfile` + GitHub Actions in a later session)

---

## When you're stuck

Ask the user. Don't guess at:
- Whether to use a different library
- Whether to deviate from `API_CONTRACT.md`
- Whether to add features not listed in the build phases
- Whether to merge a PR (always wait for confirmation)