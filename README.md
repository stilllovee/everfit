# Everfit Metric Tracking System

## Time Estimate

Estimated implementation time before starting: 3 to 4 hours.

## 1. Requirements

### Functional Requirements

Users should be able to:

1. **Record a metric** — submit a measurement (value, unit, date) for a given metric type (distance or temperature) tied to their user ID.
2. **Retrieve a metric list** — query all recorded metrics by type, with optional date-range or period filters, and receive values converted to a requested unit.
3. **Retrieve chart-ready data** — get one data point per calendar day (the latest entry for that day), filtered by type and period, with optional unit conversion.

### Non-functional Requirements

1. **Scale is out of scope** — the system targets a small number of users and low request volume; no horizontal scaling, sharding, or read replicas are needed. `userId` is trusted as-is and authentication is handled outside this service.


> **Note on the database:** This project uses SQLite via `sql.js` for zero-configuration setup. SQLite is sufficient for a single-instance API handling a small number of users. In a real-world deployment, swap the TypeORM data-source to **PostgreSQL** (or another production-grade RDBMS) to gain concurrent writes, mature tooling, and proper connection pooling.

---

## 2. Overview

This project implements a small Metric Tracking System in Node.js for two metric families: distance and temperature. Users can store measurements by day, retrieve raw history, and fetch chart-ready data that keeps only the latest entry per day. The API also supports on-demand unit conversion, so writes stay simple while reads can adapt to the caller's preferred unit.

## Stack

- Node.js 24+
- TypeScript
- NestJS
- TypeORM
- SQLite-compatible persistence via `sql.js`
- Vitest for tests

## 3. Data Model

Entity: `Metric`

- `id`
- `userId`
- `type` (`DISTANCE | TEMPERATURE`)
- `value` (`number`)
- `unit` (`m | cm | inch | ft | yd | C | F | K`)
- `date` (`YYYY-MM-DD`)
- `createdAt`

Entity: `DailyMetricSnapshot`

- `id`
- `userId`
- `type`
- `metricId` — source metric this snapshot was derived from
- `value`
- `unit`
- `date` (`YYYY-MM-DD`)
- `metricCreatedAt` — createdAt of the source metric
- `snapshotAt` — when the cron job produced the row

A unique constraint on `(userId, type, date)` enforces one snapshot row per user/type/day. The cron job deletes the stale row and re-inserts when it refreshes.

Key decision: both tables store the original value and original unit instead of normalising on write.

## 4. API Design

### Create Metric

`POST /metrics`

Request body:

```json
{
  "userId": "user-123",
  "type": "DISTANCE",
  "value": 1200,
  "unit": "cm",
  "date": "2026-03-30"
}
```

Success response (`201 Created`):

```json
{
  "data": {
    "id": "8bb3e722-f62d-4d90-8d7d-5271a0334b9d",
    "userId": "user-123",
    "type": "DISTANCE",
    "value": 1200,
    "unit": "cm",
    "date": "2026-03-30",
    "createdAt": "2026-04-01T16:25:14.105Z"
  }
}
```

### Get Metric List

`GET /metrics?userId=&type=&from=&to=&period=&unit=`

Supported filters:

- `userId` required
- `type` required
- `from` and `to` optional
- `period` optional convenience filter such as `30d` or `2m`
- `unit` optional target unit for conversion

Success response (`200 OK`):

```json
{
  "data": [
    {
      "id": "a70e981b-cb5c-4ef9-9fdc-d07dbd76cce2",
      "userId": "user-123",
      "type": "TEMPERATURE",
      "value": 68,
      "unit": "F",
      "date": "2026-03-30",
      "createdAt": "2026-04-01T16:26:30.240Z"
    },
    {
      "id": "e4f594bb-9d44-4f1b-b8bf-e9032fffcff8",
      "userId": "user-123",
      "type": "TEMPERATURE",
      "value": 69.8,
      "unit": "F",
      "date": "2026-03-29",
      "createdAt": "2026-04-01T16:26:05.011Z"
    }
  ],
  "meta": {
    "count": 2,
    "convertedToUnit": "F"
  }
}
```

### Get Chart Data (v1)

`GET /metrics/chart?userId=&type=&from=&to=&period=&unit=`

Chart logic:

- filter by user and metric type
- filter by explicit date range or period
- keep only the latest entry per day using a SQL window function at query time
- convert to the requested unit, or to the metric's base unit when no unit is supplied

Success response (`200 OK`):

```json
{
  "data": [
    {
      "metricId": "1fc4a3cb-fd85-452b-9ca8-4f91ff503e75",
      "date": "2026-03-30",
      "value": 6.56168,
      "unit": "ft",
      "createdAt": "2026-04-01T16:27:04.332Z"
    },
    {
      "metricId": "89ab50b4-8628-4a50-a0d6-53a84f603b35",
      "date": "2026-03-31",
      "value": 7.217848,
      "unit": "ft",
      "createdAt": "2026-04-01T16:27:51.948Z"
    }
  ],
  "meta": {
    "count": 2,
    "unit": "ft"
  }
}
```

The base-unit default on chart queries is an intentional deviation from the original outline. It makes chart values directly comparable even when the stored data mixes units.

### Get Chart Data v2

`GET /metrics/chart/v2?userId=&type=&from=&to=&period=&unit=`

Accepts the same query parameters as `GET /metrics/chart`. Instead of running the window-function query at request time, it reads the pre-computed `daily_metric_snapshots` table that is populated nightly by the cron job.

Success response (`200 OK`) — same shape as v1:

```json
{
  "data": [
    {
      "metricId": "1fc4a3cb-fd85-452b-9ca8-4f91ff503e75",
      "date": "2026-03-30",
      "value": 6.56168,
      "unit": "ft",
      "createdAt": "2026-04-01T16:27:04.332Z"
    }
  ],
  "meta": {
    "count": 1,
    "unit": "ft"
  }
}
```

Note: snapshots are written once per day by the cron job. Data inserted after a snapshot run will not appear in v2 results until the next run (or a manual refresh).

## 5. Core Logic

### 5.1 Unit Conversion

Base units:

- Distance -> meter
- Temperature -> Celsius

Conversion flow:

1. convert source value to the base unit
2. convert base value to the target unit

This keeps conversion logic linear instead of building a separate conversion for every unit pair.

### 5.2 Latest Per Day

The v1 chart query uses a SQL window function:

```sql
ROW_NUMBER() OVER (PARTITION BY date ORDER BY created_at DESC, id DESC)
```

That lets SQLite return only the newest metric for each day directly in the database layer.

### 5.3 Daily Snapshot Cron Job

A NestJS `@Cron` task (`MetricsCronService`) runs at **00:05 every day** and materialises the latest metric per `(userId, type, date)` for the previous calendar day into the `daily_metric_snapshots` table.

Cron expression: `5 0 * * *`

The job logic:

1. Determine yesterday's date.
2. Run the same window-function query used by v1 but partitioned by `(userId, type)` instead of just `date`.
3. For each resulting row, delete the existing snapshot (if any) for that `(userId, type, date)` triple and insert the fresh one.

The `refreshSnapshotsForDate(date)` method is also exported so historical dates can be back-filled on demand without triggering the scheduler.

### 5.4 Trade-offs: Chart v1 vs Chart v2

| | **v1 — live window function** | **v2 — snapshot table** |
|---|---|---|
| **Freshness** | Always reflects the latest data, including metrics inserted moments ago | Up to ~24 h stale; reflects whatever was the last metric at snapshot time |
| **Read performance** | `O(n)` window function over all matching rows on every request | Simple indexed point-read on `daily_metric_snapshots`; fast regardless of how many raw rows exist |
| **Write overhead** | None — only the `metrics` table is written | Cron job performs one delete + one insert per `(userId, type)` per day |
| **Operational complexity** | No extra infrastructure | Requires the scheduler to be running; snapshot gaps appear if the job fails silently |
| **Data consistency** | Always consistent with `metrics` | Can diverge if a metric is retroactively inserted or corrected for a past date after the snapshot ran |
| **Best for** | Low-to-medium data volumes where real-time accuracy matters | High data volumes or dashboards where slightly stale data is acceptable and query speed is the priority |

**Chosen approach:** both endpoints are kept. v1 is the canonical answer; v2 is additive and shows how the system can be extended for performance without changing the existing contract.

## 6. Performance

- TypeORM index on `(userId, type, date, createdAt)` supports the main read paths.
- Filtering and ordering happen in the database layer through TypeORM.
- The v1 chart endpoint uses a raw SQL window function so latest-per-day reduction happens in the database, not in an application loop.
- The v2 chart endpoint reads from the pre-computed `daily_metric_snapshots` table, avoiding the window function entirely. It is faster at large data volumes because the heavy work is done offline by the cron job.
- Unit conversion runs after filtering, so only the final result set is transformed.

## 7. Code Structure

- `src/main.ts` -> NestJS bootstrap
- `src/metrics` -> controller, service, cron service, DTOs, and TypeORM entities
  - `entities/metric.entity.ts` -> raw metric rows
  - `entities/daily-metric-snapshot.entity.ts` -> pre-computed latest-per-day rows
  - `metrics-cron.service.ts` -> nightly snapshot job
- `src/utils` -> conversion and date utilities
- `src/types` -> metric type definitions

## 8. Tests

Included tests cover:

- unit conversion
- compatibility checks between metric types and units
- latest-per-day chart logic
- converted list responses

## Run Locally

```bash
npm install
npm run dev
```

The server starts on `http://localhost:3000` by default.

## Scripts

- `npm run dev` -> start the API in watch mode
- `npm run build` -> compile TypeScript
- `npm run start` -> run the compiled build
- `npm run test` -> run tests
- `npm run lint` -> type-check the project

## Example Requests

Create a metric:

```bash
curl -X POST http://localhost:3000/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "type": "DISTANCE",
    "value": 100,
    "unit": "cm",
    "date": "2026-03-30"
  }'
```

List temperature metrics converted to Fahrenheit:

```bash
curl "http://localhost:3000/metrics?userId=user-123&type=TEMPERATURE&from=2026-03-01&to=2026-03-31&unit=F"
```

Fetch one month of chart data in feet (v1 — live window function):

```bash
curl "http://localhost:3000/metrics/chart?userId=user-123&type=DISTANCE&period=1m&unit=ft"
```

Fetch one month of chart data in feet (v2 — reads snapshot table):

```bash
curl "http://localhost:3000/metrics/chart/v2?userId=user-123&type=DISTANCE&period=1m&unit=ft"
```

## Example Error Response

Validation error (`400 Bad Request`):

```json
{
  "message": [
    "unit must be one of the following values: m, cm, inch, ft, yd, C, F, K"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

## Notes for Submission

The repository is ready to share as source code. A short English walkthrough video is still needed outside this workspace, but the sections above can be used directly as the script outline.