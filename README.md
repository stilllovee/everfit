# Everfit Metric Tracking System

## Time Estimate

Estimated implementation time before starting: 3 to 4 hours.

## 1. Overview

This project implements a small Metric Tracking System in Node.js for two metric families: distance and temperature. Users can store measurements by day, retrieve raw history, and fetch chart-ready data that keeps only the latest entry per day. The API also supports on-demand unit conversion, so writes stay simple while reads can adapt to the caller's preferred unit.

## Stack

- Node.js 24+
- TypeScript
- NestJS
- TypeORM
- SQLite-compatible persistence via `sql.js`
- Vitest for tests

## 2. Data Model

Entity: `Metric`

- `id`
- `userId`
- `type` (`DISTANCE | TEMPERATURE`)
- `value` (`number`)
- `unit` (`m | cm | inch | ft | yd | C | F | K`)
- `date` (`YYYY-MM-DD`)
- `createdAt`

Key decision: the database stores the original value and original unit instead of normalizing on write.

Trade-off:

- simpler writes and better preservation of what the user submitted
- slightly more processing on reads when a target unit is requested

I kept that trade-off because the assessment focuses on correctness and clarity more than high-volume analytical workloads.

## 3. API Design

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

### Get Chart Data

`GET /metrics/chart?userId=&type=&from=&to=&period=&unit=`

Chart logic:

- filter by user and metric type
- filter by explicit date range or period
- keep only the latest entry per day
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

## 4. Core Logic

### 4.1 Unit Conversion

Base units:

- Distance -> meter
- Temperature -> Celsius

Conversion flow:

1. convert source value to the base unit
2. convert base value to the target unit

This keeps conversion logic linear instead of building a separate conversion for every unit pair.

### 4.2 Latest Per Day

The chart query uses a SQL window function:

```sql
ROW_NUMBER() OVER (PARTITION BY date ORDER BY created_at DESC, id DESC)
```

That lets SQLite return only the newest metric for each day directly in the database layer.

## 5. Performance

- TypeORM index on `(userId, type, date, createdAt)` supports the main read paths.
- Filtering and ordering happen in the database layer through TypeORM.
- The chart endpoint uses a raw SQL window function so latest-per-day reduction happens in the database, not in an application loop.
- Unit conversion runs after filtering, so only the final result set is transformed.

## 6. Code Structure

- `src/main.ts` -> NestJS bootstrap
- `src/metrics` -> controller, service, DTOs, and TypeORM entity
- `src/utils` -> conversion and date utilities
- `src/types` -> metric type definitions

## 7. Tests

Included tests cover:

- unit conversion
- compatibility checks between metric types and units
- latest-per-day chart logic
- converted list responses

## 8. Assumptions

- dates are treated as UTC calendar dates
- a user can store multiple metrics on the same day
- authentication is out of scope; `userId` is always supplied by the caller
- validation is intentionally practical, not domain-heavy

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

Fetch one month of chart data in feet:

```bash
curl "http://localhost:3000/metrics/chart?userId=user-123&type=DISTANCE&period=1m&unit=ft"
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