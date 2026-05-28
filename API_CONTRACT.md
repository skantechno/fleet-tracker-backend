# Fleet Tracker — API Contract

**Shared specification.** Both `fleet-tracker-backend` and `fleet-tracker-frontend` follow this exactly. Changes to this file should be made first, then implemented on both sides.

---

## 0. Response Envelope

**Every JSON response uses a consistent envelope.** Clients can branch on the boolean `success` field.

### Success

```json
{
  "success": true,
  "data": <payload>,
  "meta": { /* optional — present only on paginated list responses */ }
}
```

- `data` holds the endpoint payload (object or array).
- `meta` is omitted unless there is metadata to return (currently only `pagination`).
- `204 No Content` responses (e.g. `DELETE`) have an **empty body** — no envelope.

### Error

```json
{
  "success": false,
  "error": {
    "message": "Human-readable message",
    "code": "MACHINE_READABLE_CODE",
    "details": { /* optional */ }
  }
}
```

HTTP status codes: 200, 201, 204, 400, 401, 403, 404, 422 (validation), 500.

### Pagination

Paginated list endpoints accept `?page=<n>&pageSize=<n>` (defaults `page=1`, `pageSize=20`; `pageSize` max `100`) and include a `meta.pagination` block:

```json
{
  "success": true,
  "data": [ /* items */ ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 213,
      "totalPages": 11,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 1. Authentication

JWT (HS256 for dev, RS256 with JWKs for production-ready bonus). Bearer token in `Authorization` header for REST; passed as auth payload for Socket.io.

### Seed users (created automatically on first run)

| Email | Password | Role |
|---|---|---|
| admin@demo.com | admin123 | admin |
| dispatcher@demo.com | dispatcher123 | dispatcher |

- **admin** — sees all vehicles, can create/edit geofences, sees all alerts
- **dispatcher** — sees only vehicles assigned to them (vehicles `v-001` through `v-003`), read-only on geofences

---

## 2. REST Endpoints

Base URL: `http://localhost:3000/api`

### Auth

```
POST   /auth/login
       body: { email, password }
       → 200: { success: true, data: { token, user: { id, email, role } } }
       → 401: { success: false, error: { message: "Invalid credentials", code: "INVALID_CREDENTIALS" } }

GET    /auth/me
       headers: Authorization: Bearer <token>
       → 200: { success: true, data: { id, email, role } }
       → 401: { success: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } }
```

### Vehicles

```
GET    /vehicles
       → 200: { success: true, data: [{ id, name, status, lastLat, lastLng, lastSpeed, lastFuel, lastUpdate }] }
       (filtered by role: dispatchers see only their assigned)

GET    /vehicles/:id
       → 200: { success: true, data: { id, name, status, lastLat, lastLng, lastSpeed, lastFuel, lastUpdate } }

GET    /vehicles/:id/history?from=ISO&to=ISO
       → 200: { success: true, data: [{ timestamp, lat, lng, speed, fuel }] }
       (queries InfluxDB; default last 1 hour if no params)
```

### Alerts

```
GET    /alerts?page=1&pageSize=50
       → 200: { success: true, data: [{ id, vehicleId, type, message, severity, timestamp, acknowledged }], meta: { pagination } }
       (types: "speed_violation" | "geofence_exit" | "low_fuel" | "offline")

POST   /alerts/:id/acknowledge
       → 200: { success: true, data: { acknowledged: true } }
```

### Geofences (admin only)

```
GET    /geofences
       → 200: { success: true, data: [{ id, name, coordinates, type }] }
       (coordinates: array of [lat, lng] pairs forming a polygon)
       (type: "allow" | "deny")

POST   /geofences
       body: { name, coordinates, type }
       → 201: { success: true, data: { id, name, coordinates, type } }

DELETE /geofences/:id
       → 204  (empty body)
```

---

## 3. Socket.io Events

Connect to: `ws://localhost:3000` with `auth: { token: '<jwt>' }`

### Server → Client events

```
"vehicle:update"
  payload: { vehicleId, lat, lng, speed, fuel, status, timestamp }
  (emitted whenever a new MQTT message arrives for that vehicle)

"alert:new"
  payload: { id, vehicleId, type, message, severity, timestamp }
  (emitted when a new alert is generated)

"connection:status"
  payload: { mqtt: "connected" | "disconnected", influx: "connected" | "disconnected" }
  (emitted on connect and on status change)
```

### Client → Server events

```
"subscribe:vehicle"
  payload: { vehicleId }
  (subscribe to live updates for a single vehicle, in addition to broadcast)

"unsubscribe:vehicle"
  payload: { vehicleId }
```

---

## 4. MQTT Topics

The backend subscribes to these. The simulator publishes to them.

```
vehicles/{vehicleId}/telemetry
  payload (JSON):
  {
    "vehicleId": "v-001",
    "timestamp": "2026-05-22T10:30:00.000Z",
    "lat": 25.397,
    "lng": 68.367,
    "speed": 45,
    "fuel": 78,
    "status": "active"
  }

vehicles/{vehicleId}/status
  payload (JSON):
  {
    "vehicleId": "v-001",
    "status": "active" | "idle" | "offline" | "maintenance",
    "timestamp": "..."
  }
```

QoS 1, retained = false for telemetry, retained = true for status.

---

## 5. InfluxDB Schema

- **Bucket:** `telemetry`
- **Measurement:** `vehicle_telemetry`
- **Tags:** `vehicle_id`, `status`
- **Fields:** `lat` (float), `lng` (float), `speed` (float), `fuel` (float)
- **Timestamp:** from MQTT payload

Sample Flux query for vehicle history:
```
from(bucket: "telemetry")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "vehicle_telemetry")
  |> filter(fn: (r) => r.vehicle_id == "v-001")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
```

---

## 6. PostgreSQL Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'dispatcher')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vehicles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  coordinates JSONB NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('allow', 'deny')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  acknowledged BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT now()
);
```

---

## 7. Error Response Shape

All errors use the envelope defined in [§0](#0-response-envelope):

```json
{
  "success": false,
  "error": {
    "message": "Human-readable message",
    "code": "MACHINE_READABLE_CODE",
    "details": { /* optional */ }
  }
}
```

HTTP status codes: 400 (bad request), 401 (unauth), 403 (forbidden), 404 (not found), 422 (validation), 500 (server).
