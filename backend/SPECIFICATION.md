# UBC Degree Planner — Backend API Specification

**API Version:** v1
**Base URL:** `http://localhost:3000`
**Content-Type:** `application/json`

---

## Table of Contents

1. [Global Conventions](#1-global-conventions)
2. [Data Models](#2-data-models)
3. [Health Check](#3-health-check)
4. [Course Endpoints](#4-course-endpoints)
   - [4.1 List Courses](#41-list-courses)
   - [4.2 Get Course by ID](#42-get-course-by-id)
   - [4.3 Seed Courses](#43-seed-courses)
5. [Plan Endpoints](#5-plan-endpoints)
   - [5.1 List Plans](#51-list-plans)
   - [5.2 Create Plan](#52-create-plan)
   - [5.3 Get Plan](#53-get-plan)
   - [5.4 Update Plan](#54-update-plan)
   - [5.5 Delete Plan](#55-delete-plan)
6. [Plan Entry Endpoints](#6-plan-entry-endpoints)
   - [6.1 Add Entry](#61-add-entry)
   - [6.2 Update Entry](#62-update-entry)
   - [6.3 Delete Entry](#63-delete-entry)
   - [6.4 Reorder Entries](#64-reorder-entries)
7. [Validation Endpoints](#7-validation-endpoints)
   - [7.1 Validate Plan](#71-validate-plan)
8. [Dependencies and Related Endpoints](#8-dependencies-and-related-endpoints)

---

## 1. Global Conventions

### 1.1 Authentication and Authorization

No authentication or authorization is required for any endpoint. All endpoints are public. Auth will be added in a future version.

### 1.2 Error Response Format

All errors follow a consistent shape:

```json
{
  "error": "error_code",
  "message": "Human-readable explanation",
  "fields": { "fieldName": "constraint violated" }
}
```

| Field     | Type                      | Required | Description                                    |
|-----------|---------------------------|----------|------------------------------------------------|
| `error`   | `string`                  | Yes      | Machine-readable error code (see table below)  |
| `message` | `string`                  | No       | Human-readable description                     |
| `fields`  | `Record<string, string>`  | No       | Per-field validation errors (validation_error only) |

**Error codes:**

| Code               | HTTP Status | Trigger                                                    |
|--------------------|-------------|------------------------------------------------------------|
| `validation_error` | 400         | Missing or invalid request fields                          |
| `not_found`        | 404         | Resource does not exist                                    |
| `conflict`         | 409         | Unique constraint violated (e.g., duplicate course in plan)|
| `internal_error`   | 500         | Unhandled server error                                     |

### 1.3 Request Headers

| Header         | Value              | Required | Notes                        |
|----------------|--------------------|----------|------------------------------|
| `Content-Type` | `application/json` | Yes      | For all POST/PUT/PATCH bodies|

### 1.4 Response Headers

Standard Express defaults. No custom headers. CORS is enabled for all origins via the `cors` middleware.

### 1.5 Rate Limiting and Throttling

No rate limiting is currently implemented. All endpoints are unthrottled.

### 1.6 Versioning and Deprecation

- Current version: **v1** (path prefix `/api/v1/`)
- The health check endpoint (`/api/health`) is unversioned.
- No deprecated endpoints exist.

---

## 2. Data Models

### 2.1 PrerequisiteRule (JSONB, recursive union)

A prerequisite is a tree structure stored as JSONB. Four node types:

```ts
type PrerequisiteRule =
  | { type: "course"; courseId: string; minGrade?: number }
  | { type: "all_of"; rules: PrerequisiteRule[] }
  | { type: "one_of"; rules: PrerequisiteRule[]; minCount?: number }
  | { type: "min_credits"; minCredits: number; from?: string[] }
```

| Type          | Meaning                                                       | Example                                             |
|---------------|---------------------------------------------------------------|-----------------------------------------------------|
| `course`      | A single course must be completed                             | `{ "type": "course", "courseId": "CPSC110" }`       |
| `all_of`      | All child rules must be satisfied                             | `{ "type": "all_of", "rules": [...] }`              |
| `one_of`      | At least `minCount` (default 1) child rules must be satisfied | `{ "type": "one_of", "rules": [...], "minCount": 1 }`|
| `min_credits` | At least N credits completed, optionally from a course pool   | `{ "type": "min_credits", "minCredits": 6 }`        |

### 2.2 Course

| Field           | Type                      | Nullable | Description                                          |
|-----------------|---------------------------|----------|------------------------------------------------------|
| `id`            | `string` (max 16 chars)   | No       | Primary key, e.g., `"CPSC110"`                       |
| `dept`          | `string` (max 8 chars)    | No       | Department code, e.g., `"CPSC"`                      |
| `code`          | `string` (max 8 chars)    | No       | Course number, e.g., `"110"`                         |
| `title`         | `string`                  | No       | Full course title                                    |
| `credits`       | `string` (numeric 3,1)    | No       | Credit value, default `"3.0"`                        |
| `description`   | `string`                  | Yes      | Course description                                   |
| `prerequisites` | `PrerequisiteRule`        | Yes      | Prerequisite tree, `null` if none                    |
| `corequisites`  | `string[]`                | No       | Array of course IDs, default `[]`                    |
| `termsOffered`  | `string[]`                | No       | Terms when offered, values: `"W1"`, `"W2"`, `"S"`   |
| `createdAt`     | `string` (ISO 8601)       | No       | Timestamp with timezone                               |
| `updatedAt`     | `string` (ISO 8601)       | No       | Timestamp with timezone                               |

### 2.3 Plan

| Field         | Type                  | Nullable | Description                     |
|---------------|-----------------------|----------|---------------------------------|
| `id`          | `string` (UUID v4)    | No       | Auto-generated primary key      |
| `name`        | `string`              | No       | Plan name                       |
| `description` | `string`              | Yes      | Optional description            |
| `createdAt`   | `string` (ISO 8601)   | No       | Timestamp with timezone          |
| `updatedAt`   | `string` (ISO 8601)   | No       | Timestamp with timezone          |

### 2.4 PlanSummary (returned by list endpoint)

Extends Plan with:

| Field        | Type     | Nullable | Description                        |
|--------------|----------|----------|------------------------------------|
| `entryCount` | `number` | No       | Number of entries in the plan      |

### 2.5 PlanEntry

| Field      | Type                 | Nullable | Description                                              |
|------------|----------------------|----------|----------------------------------------------------------|
| `id`       | `string` (UUID v4)   | No       | Auto-generated primary key                               |
| `planId`   | `string` (UUID v4)   | No       | Foreign key → `plans.id` (CASCADE on delete)             |
| `courseId`  | `string` (max 16)    | No       | Foreign key → `courses.id`                               |
| `year`     | `number` (1–5)       | No       | Academic year in the plan                                |
| `term`     | `string`             | No       | One of `"W1"`, `"W2"`, `"S"`                            |
| `status`   | `string`             | No       | One of `"planned"`, `"completed"`, `"failed"`, `"in_progress"` |
| `position` | `number`             | No       | Sort order within the term column, default `0`           |
| `createdAt`| `string` (ISO 8601)  | No       | Timestamp with timezone                                   |
| `updatedAt`| `string` (ISO 8601)  | No       | Timestamp with timezone                                   |

**Database constraints:**
- `UNIQUE(plan_id, course_id)` — a course can only appear once per plan
- `CHECK year BETWEEN 1 AND 5`
- `CHECK term IN ('W1', 'W2', 'S')`
- `CHECK status IN ('planned', 'completed', 'failed', 'in_progress')`

### 2.6 ValidationResult

| Field        | Type                  | Nullable | Description                                        |
|--------------|-----------------------|----------|----------------------------------------------------|
| `valid`      | `boolean`             | No       | `true` if no errors                                |
| `errors`     | `ValidationError[]`   | No       | List of prerequisite violations                    |
| `warnings`   | `ValidationWarning[]` | No       | List of non-blocking issues (e.g., credit overload)|
| `computedAt` | `string` (ISO 8601)   | No       | When the validation was computed                   |
| `cached`     | `boolean`             | No       | `true` if result was served from Redis cache       |

### 2.7 ValidationError / ValidationWarning

| Field      | Type     | Nullable | Description                              |
|------------|----------|----------|------------------------------------------|
| `entryId`  | `string` | No       | The plan entry that has the issue         |
| `courseId`  | `string` | No       | The course involved                       |
| `message`  | `string` | No       | Human-readable description of the problem |

---

## 3. Health Check

### `GET /api/health`

**Operation ID:** `healthCheck`

**Description:** Returns server health status. Unversioned, does not check database or Redis connectivity.

**Request:** No parameters, no body.

**Responses:**

| Status | Description   | Body                     |
|--------|---------------|--------------------------|
| 200    | Server is up  | `{ "status": "ok" }`     |

**Example:**

```
GET /api/health
```

```json
{ "status": "ok" }
```

**Side Effects:** None.

---

## 4. Course Endpoints

### 4.1 List Courses

### `GET /api/v1/courses`

**Operation ID:** `listCourses`

**Description:** Returns a paginated, filterable list of courses from the catalog. Supports searching by title, ID, or description, and filtering by department or course level.

**Query Parameters:**

| Name     | Type     | Default | Constraints                 | Description                                                    |
|----------|----------|---------|-----------------------------|----------------------------------------------------------------|
| `offset` | `number` | `0`     | `>= 0`                     | Number of records to skip                                       |
| `limit`  | `number` | `20`    | `1–100`                     | Max records to return (clamped)                                 |
| `dept`   | `string` | —       | Uppercased automatically    | Filter by department (exact match, e.g., `CPSC`)               |
| `level`  | `string` | —       | Leading digit of course code| Filter by level (e.g., `3` matches `3xx` courses)              |
| `q`      | `string` | —       | Case-insensitive            | Search title, ID, and description (substring match via `ILIKE`)|

**Responses:**

| Status | Description     | Body                                                  |
|--------|-----------------|-------------------------------------------------------|
| 200    | Success         | `{ "data": Course[], "pagination": Pagination }`      |
| 500    | Internal error  | `{ "error": "internal_error" }`                       |

**Pagination object:**

| Field    | Type     | Description               |
|----------|----------|---------------------------|
| `offset` | `number` | Current offset             |
| `limit`  | `number` | Page size used             |
| `total`  | `number` | Total matching records     |

**Example:**

```
GET /api/v1/courses?dept=CPSC&level=2&limit=2
```

```json
{
  "data": [
    {
      "id": "CPSC210",
      "dept": "CPSC",
      "code": "210",
      "title": "Software Construction",
      "credits": "4.0",
      "description": "Design and implementation of robust software components using Java.",
      "prerequisites": { "type": "course", "courseId": "CPSC110" },
      "corequisites": [],
      "termsOffered": ["W1", "W2", "S"],
      "createdAt": "2026-04-01T00:00:00.000Z",
      "updatedAt": "2026-04-01T00:00:00.000Z"
    },
    {
      "id": "CPSC213",
      "dept": "CPSC",
      "code": "213",
      "title": "Introduction to Computer Systems",
      "credits": "4.0",
      "description": "Software architecture, operating systems, and I/O.",
      "prerequisites": {
        "type": "all_of",
        "rules": [
          { "type": "course", "courseId": "CPSC121" },
          { "type": "course", "courseId": "CPSC210" }
        ]
      },
      "corequisites": [],
      "termsOffered": ["W1", "W2"],
      "createdAt": "2026-04-01T00:00:00.000Z",
      "updatedAt": "2026-04-01T00:00:00.000Z"
    }
  ],
  "pagination": { "offset": 0, "limit": 2, "total": 5 }
}
```

**Side Effects:** None (read-only).

**Validation Rules:**
- `offset` is clamped to `>= 0` (negative values become 0)
- `limit` is clamped to `[1, 100]`
- `dept` is uppercased before matching
- `q` is matched via `ILIKE` (SQL injection is prevented by Drizzle ORM parameterization)

---

### 4.2 Get Course by ID

### `GET /api/v1/courses/:id`

**Operation ID:** `getCourse`

**Description:** Returns a single course by its ID. The ID is uppercased automatically, so `cpsc110` and `CPSC110` both match.

**Path Parameters:**

| Name | Type     | Required | Description                         |
|------|----------|----------|-------------------------------------|
| `id` | `string` | Yes      | Course ID (e.g., `CPSC110`). Case-insensitive. |

**Responses:**

| Status | Description        | Body                                                |
|--------|--------------------|-----------------------------------------------------|
| 200    | Course found       | `Course` object (see [2.2](#22-course))             |
| 404    | Course not found   | `{ "error": "not_found", "message": "Course not found" }` |
| 500    | Internal error     | `{ "error": "internal_error" }`                     |

**Example:**

```
GET /api/v1/courses/CPSC110
```

```json
{
  "id": "CPSC110",
  "dept": "CPSC",
  "code": "110",
  "title": "Computation, Programs, and Programming",
  "credits": "4.0",
  "description": "Fundamental program and computation structures using functional programming.",
  "prerequisites": null,
  "corequisites": [],
  "termsOffered": ["W1", "W2", "S"],
  "createdAt": "2026-04-01T00:00:00.000Z",
  "updatedAt": "2026-04-01T00:00:00.000Z"
}
```

**Side Effects:** None (read-only).

---

### 4.3 Seed Courses

### `POST /api/v1/courses/seed`

**Operation ID:** `seedCourses`

**Description:** Enqueues a background job (via BullMQ) that inserts the hardcoded seed data (~29 UBC CS/MATH/STAT courses) into the database using `INSERT ... ON CONFLICT DO NOTHING`. Returns immediately with the job ID — the seed happens asynchronously.

**Request:** No body required.

**Responses:**

| Status | Description     | Body                                                    |
|--------|-----------------|---------------------------------------------------------|
| 202    | Job enqueued    | `{ "message": "Seed job enqueued", "jobId": "string" }` |
| 500    | Internal error  | `{ "error": "internal_error" }`                         |

**Example:**

```
POST /api/v1/courses/seed
```

```json
{
  "message": "Seed job enqueued",
  "jobId": "1"
}
```

**Side Effects:**
- Enqueues a job on the `course-seed` BullMQ queue.
- The seed worker inserts courses into the `courses` table.
- Existing courses (by ID) are not overwritten (`ON CONFLICT DO NOTHING`).
- Job completes asynchronously — there is no polling endpoint to check job status.

**Idempotency:** Safe to call multiple times. Duplicate courses are skipped.

**Dependencies:** Requires Redis to be running (BullMQ uses Redis as a job queue backend).

---

## 5. Plan Endpoints

### 5.1 List Plans

### `GET /api/v1/plans`

**Operation ID:** `listPlans`

**Description:** Returns all plans with their entry counts. Plans are not paginated — all plans are returned in a single response.

**Request:** No parameters, no body.

**Responses:**

| Status | Description    | Body                                           |
|--------|----------------|-------------------------------------------------|
| 200    | Success        | `PlanSummary[]` (see [2.4](#24-plansummary))    |
| 500    | Internal error | `{ "error": "internal_error" }`                 |

**Example:**

```
GET /api/v1/plans
```

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "CS Major Plan",
    "description": "4-year plan for CPSC major",
    "createdAt": "2026-04-01T10:00:00.000Z",
    "updatedAt": "2026-04-01T10:00:00.000Z",
    "entryCount": 12
  }
]
```

**Side Effects:** None (read-only).

---

### 5.2 Create Plan

### `POST /api/v1/plans`

**Operation ID:** `createPlan`

**Description:** Creates a new degree plan. Returns the created plan object.

**Request Body:**

| Field         | Type     | Required | Constraints         | Description                 |
|---------------|----------|----------|---------------------|-----------------------------|
| `name`        | `string` | Yes      | Non-empty after trim| Plan display name           |
| `description` | `string` | No       | —                   | Optional plan description   |

**Responses:**

| Status | Description       | Body                                                                |
|--------|-------------------|---------------------------------------------------------------------|
| 201    | Plan created      | `Plan` object (see [2.3](#23-plan))                                 |
| 400    | Validation error  | `{ "error": "validation_error", "message": "name is required", "fields": { "name": "required" } }` |
| 500    | Internal error    | `{ "error": "internal_error" }`                                     |

**Example:**

```
POST /api/v1/plans
Content-Type: application/json

{ "name": "CS Major Plan", "description": "4-year plan for CPSC major" }
```

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "CS Major Plan",
  "description": "4-year plan for CPSC major",
  "createdAt": "2026-04-01T10:00:00.000Z",
  "updatedAt": "2026-04-01T10:00:00.000Z"
}
```

**Validation Rules:**
- `name` must be a non-empty string (after trimming whitespace)
- `name` is trimmed before storage
- `description` defaults to `null` if omitted

**Side Effects:** Inserts one row into the `plans` table.

**Idempotency:** Not idempotent — each call creates a new plan with a new UUID, even with identical names.

---

### 5.3 Get Plan

### `GET /api/v1/plans/:id`

**Operation ID:** `getPlan`

**Description:** Returns a single plan with all its entries grouped by `[year][term]`. This is the primary endpoint for loading the plan board UI.

**Path Parameters:**

| Name | Type     | Required | Description          |
|------|----------|----------|----------------------|
| `id` | `string` | Yes      | Plan UUID            |

**Responses:**

| Status | Description      | Body                                                        |
|--------|------------------|-------------------------------------------------------------|
| 200    | Plan found       | `PlanWithEntries` object (see below)                        |
| 404    | Plan not found   | `{ "error": "not_found", "message": "Plan not found" }`    |
| 500    | Internal error   | `{ "error": "internal_error" }`                             |

**PlanWithEntries shape:**

```json
{
  "id": "uuid",
  "name": "CS Major Plan",
  "description": "...",
  "createdAt": "...",
  "updatedAt": "...",
  "entries": {
    "1": {
      "W1": [
        {
          "id": "entry-uuid",
          "planId": "plan-uuid",
          "courseId": "CPSC110",
          "year": 1,
          "term": "W1",
          "status": "completed",
          "position": 0
        }
      ],
      "W2": []
    },
    "2": { ... }
  }
}
```

The `entries` field is a nested object: `Record<yearString, Record<termString, PlanEntry[]>>`. Only year/term combinations that have entries are present — missing keys mean no entries for that slot.

Entries within each term are ordered by `position ASC`.

**Side Effects:** None (read-only).

---

### 5.4 Update Plan

### `PUT /api/v1/plans/:id`

**Operation ID:** `updatePlan`

**Description:** Updates a plan's metadata (name and/or description). Does not modify entries.

**Path Parameters:**

| Name | Type     | Required | Description |
|------|----------|----------|-------------|
| `id` | `string` | Yes      | Plan UUID   |

**Request Body:**

| Field         | Type     | Required | Description                           |
|---------------|----------|----------|---------------------------------------|
| `name`        | `string` | No       | New plan name (if provided, updated)  |
| `description` | `string` | No       | New description (if provided, updated)|

At least one field should be provided, though the endpoint does not enforce this — sending an empty body updates only `updatedAt`.

**Responses:**

| Status | Description      | Body                                                     |
|--------|------------------|----------------------------------------------------------|
| 204    | Updated          | No body                                                  |
| 404    | Plan not found   | `{ "error": "not_found", "message": "Plan not found" }`  |
| 500    | Internal error   | `{ "error": "internal_error" }`                          |

**Example:**

```
PUT /api/v1/plans/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Content-Type: application/json

{ "name": "Updated Plan Name" }
```

Response: `204 No Content`

**Side Effects:**
- Updates the plan row, always bumps `updatedAt` to current time.

**Idempotency:** Idempotent — calling with the same body produces the same result.

---

### 5.5 Delete Plan

### `DELETE /api/v1/plans/:id`

**Operation ID:** `deletePlan`

**Description:** Deletes a plan and all its entries (via `ON DELETE CASCADE`). Also invalidates any cached validation result for this plan.

**Path Parameters:**

| Name | Type     | Required | Description |
|------|----------|----------|-------------|
| `id` | `string` | Yes      | Plan UUID   |

**Responses:**

| Status | Description      | Body                                                     |
|--------|------------------|----------------------------------------------------------|
| 200    | Deleted          | The deleted `Plan` object                                |
| 404    | Plan not found   | `{ "error": "not_found", "message": "Plan not found" }`  |
| 500    | Internal error   | `{ "error": "internal_error" }`                          |

**Example:**

```
DELETE /api/v1/plans/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "CS Major Plan",
  "description": null,
  "createdAt": "2026-04-01T10:00:00.000Z",
  "updatedAt": "2026-04-01T10:00:00.000Z"
}
```

**Side Effects:**
- Deletes the plan row from `plans`.
- Cascades to delete all rows in `plan_entries` referencing this plan.
- Invalidates the Redis validation cache for this plan ID.

**Idempotency:** Not idempotent — second call returns 404.

---

## 6. Plan Entry Endpoints

### 6.1 Add Entry

### `POST /api/v1/plans/:id/entries`

**Operation ID:** `addEntry`

**Description:** Adds a course to a plan at a specific year/term position. Triggers an async validation job after insertion.

**Path Parameters:**

| Name | Type     | Required | Description |
|------|----------|----------|-------------|
| `id` | `string` | Yes      | Plan UUID   |

**Request Body:**

| Field      | Type     | Required | Default      | Constraints                                              |
|------------|----------|----------|--------------|----------------------------------------------------------|
| `courseId`  | `string` | Yes      | —            | Must exist in `courses` table. Uppercased automatically. |
| `year`     | `number` | Yes      | —            | Integer, `1–5`                                           |
| `term`     | `string` | Yes      | —            | One of `"W1"`, `"W2"`, `"S"`                            |
| `status`   | `string` | No       | `"planned"`  | One of `"planned"`, `"completed"`, `"failed"`, `"in_progress"` |
| `position` | `number` | No       | auto (max+1) | Sort order within the term. If omitted, appended last.   |

**Responses:**

| Status | Description                    | Body                                                                |
|--------|--------------------------------|---------------------------------------------------------------------|
| 201    | Entry created                  | `PlanEntry` object (see [2.5](#25-planentry))                       |
| 400    | Missing/invalid fields         | `{ "error": "validation_error", "message": "..." }`                |
| 400    | Course does not exist          | `{ "error": "validation_error", "message": "Course CPSC999 not found" }` |
| 400    | Invalid term                   | `{ "error": "validation_error", "message": "term must be one of W1, W2, S" }` |
| 400    | Invalid year                   | `{ "error": "validation_error", "message": "year must be between 1 and 5" }` |
| 404    | Plan not found                 | `{ "error": "not_found", "message": "Plan not found" }`            |
| 409    | Course already in plan         | `{ "error": "conflict", "message": "Course already exists in this plan" }` |
| 500    | Internal error                 | `{ "error": "internal_error" }`                                    |

**Example:**

```
POST /api/v1/plans/a1b2c3d4-e5f6-7890-abcd-ef1234567890/entries
Content-Type: application/json

{
  "courseId": "CPSC110",
  "year": 1,
  "term": "W1",
  "status": "completed"
}
```

```json
{
  "id": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
  "planId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "courseId": "CPSC110",
  "year": 1,
  "term": "W1",
  "status": "completed",
  "position": 0,
  "createdAt": "2026-04-01T10:00:00.000Z",
  "updatedAt": "2026-04-01T10:00:00.000Z"
}
```

**Validation Rules:**
- `courseId` is uppercased before lookup and insertion.
- `courseId`, `year`, and `term` are all required — omitting any returns 400.
- `year` must be an integer between 1 and 5 (inclusive).
- `term` must be exactly one of `"W1"`, `"W2"`, `"S"` (case-sensitive).
- `status` must be one of the four allowed values; if invalid or missing, defaults to `"planned"`.
- The combination `(planId, courseId)` must be unique — a course can appear at most once per plan.

**Side Effects:**
- Inserts one row into `plan_entries`.
- Enqueues a plan validation job on the `plan-validation` BullMQ queue.

**Idempotency:** Not idempotent — second call with same `courseId` returns 409.

---

### 6.2 Update Entry

### `PUT /api/v1/plans/:id/entries/:entryId`

**Operation ID:** `updateEntry`

**Description:** Updates fields on an existing plan entry. Used for moving a course to a different year/term, changing its status, or updating its position.

**Path Parameters:**

| Name      | Type     | Required | Description   |
|-----------|----------|----------|---------------|
| `id`      | `string` | Yes      | Plan UUID     |
| `entryId` | `string` | Yes      | Entry UUID    |

**Request Body:**

All fields are optional. Only provided fields are updated.

| Field      | Type     | Constraints                                                |
|------------|----------|------------------------------------------------------------|
| `year`     | `number` | `1–5` (enforced by DB CHECK, not validated in app)         |
| `term`     | `string` | `"W1"`, `"W2"`, `"S"` (enforced by DB CHECK)              |
| `status`   | `string` | `"planned"`, `"completed"`, `"failed"`, `"in_progress"` (enforced by DB CHECK) |
| `position` | `number` | Integer sort order                                          |

**Responses:**

| Status | Description      | Body                                                      |
|--------|------------------|-----------------------------------------------------------|
| 204    | Updated          | No body                                                   |
| 404    | Entry not found  | `{ "error": "not_found", "message": "Entry not found" }`  |
| 500    | Internal error   | `{ "error": "internal_error" }`                           |

**Example:**

```
PUT /api/v1/plans/a1b2.../entries/f1e2...
Content-Type: application/json

{ "year": 2, "term": "W1", "status": "in_progress" }
```

Response: `204 No Content`

**Side Effects:**
- Updates the entry row, bumps `updatedAt`.
- Enqueues a plan validation job.

**Behavior Notes:**
- The `id` path parameter (plan ID) is passed to `enqueueValidation()` but is **not used to scope the entry lookup** — the entry is found by `entryId` only. This means an entry from a different plan could theoretically be updated via the wrong plan URL (a known limitation).
- Invalid `year`, `term`, or `status` values that violate DB CHECK constraints will cause a 500 error from the database.

**Idempotency:** Idempotent — calling with the same body produces the same result (except `updatedAt` advances).

---

### 6.3 Delete Entry

### `DELETE /api/v1/plans/:id/entries/:entryId`

**Operation ID:** `deleteEntry`

**Description:** Removes a course from a plan.

**Path Parameters:**

| Name      | Type     | Required | Description   |
|-----------|----------|----------|---------------|
| `id`      | `string` | Yes      | Plan UUID     |
| `entryId` | `string` | Yes      | Entry UUID    |

**Responses:**

| Status | Description      | Body                                                      |
|--------|------------------|-----------------------------------------------------------|
| 200    | Deleted          | The deleted `PlanEntry` object                            |
| 404    | Entry not found  | `{ "error": "not_found", "message": "Entry not found" }`  |
| 500    | Internal error   | `{ "error": "internal_error" }`                           |

**Example:**

```
DELETE /api/v1/plans/a1b2.../entries/f1e2...
```

```json
{
  "id": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
  "planId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "courseId": "CPSC110",
  "year": 1,
  "term": "W1",
  "status": "completed",
  "position": 0,
  "createdAt": "2026-04-01T10:00:00.000Z",
  "updatedAt": "2026-04-01T10:00:00.000Z"
}
```

**Side Effects:**
- Deletes the entry row from `plan_entries`.
- Invalidates the Redis validation cache for this plan.

**Behavior Notes:**
- Like `updateEntry`, the entry is found by `entryId` only — the plan `id` path parameter is used only for cache invalidation.

**Idempotency:** Not idempotent — second call returns 404.

---

### 6.4 Reorder Entries

### `PUT /api/v1/plans/:id/entries/reorder`

**Operation ID:** `reorderEntries`

**Description:** Batch-updates the `position` field for multiple entries. Used after drag-and-drop to persist the new sort order.

**Path Parameters:**

| Name | Type     | Required | Description |
|------|----------|----------|-------------|
| `id` | `string` | Yes      | Plan UUID   |

**Request Body:**

| Field       | Type                                           | Required | Description              |
|-------------|------------------------------------------------|----------|--------------------------|
| `positions` | `Array<{ entryId: string, position: number }>` | Yes      | New position assignments |

**Responses:**

| Status | Description        | Body                                                           |
|--------|--------------------|----------------------------------------------------------------|
| 204    | Reordered          | No body                                                        |
| 400    | Invalid body       | `{ "error": "validation_error", "message": "positions array is required" }` |
| 500    | Internal error     | `{ "error": "internal_error" }`                                |

**Example:**

```
PUT /api/v1/plans/a1b2.../entries/reorder
Content-Type: application/json

{
  "positions": [
    { "entryId": "entry-uuid-1", "position": 0 },
    { "entryId": "entry-uuid-2", "position": 1 },
    { "entryId": "entry-uuid-3", "position": 2 }
  ]
}
```

Response: `204 No Content`

**Side Effects:**
- Updates `position` and `updatedAt` for each entry in the array.
- Updates are executed in parallel via `Promise.all()`.
- Does **not** trigger validation or invalidate the cache.

**Behavior Notes:**
- Entry IDs are **not** scoped to the plan — any valid entry UUID will be updated regardless of which plan it belongs to (known limitation).
- No validation that the provided entry IDs actually belong to the specified plan.
- Position values are not validated for uniqueness or sequentiality.

**Idempotency:** Idempotent — calling with the same body produces the same result.

---

## 7. Validation Endpoints

### 7.1 Validate Plan

### `GET /api/v1/plans/:id/validate`

**Operation ID:** `validatePlan`

**Description:** Validates a plan's prerequisite graph and credit loads. Returns cached results when available (5-minute TTL). When cache misses, computes validation synchronously and caches the result before returning.

**Path Parameters:**

| Name | Type     | Required | Description |
|------|----------|----------|-------------|
| `id` | `string` | Yes      | Plan UUID   |

**Responses:**

| Status | Description      | Body                                                       |
|--------|------------------|-------------------------------------------------------------|
| 200    | Validation result| `ValidationResult` (see [2.6](#26-validationresult))        |
| 404    | Plan not found   | `{ "error": "not_found", "message": "Plan not found" }`    |
| 500    | Internal error   | `{ "error": "internal_error" }`                            |

**Example (cache miss):**

```
GET /api/v1/plans/a1b2.../validate
```

```json
{
  "valid": false,
  "errors": [
    {
      "entryId": "entry-uuid",
      "courseId": "CPSC213",
      "message": "Prerequisites not satisfied for CPSC213: all of [CPSC121, CPSC210]"
    }
  ],
  "warnings": [
    {
      "entryId": "entry-uuid-2",
      "courseId": "CPSC110",
      "message": "Term 1:W1 has 21 credits, exceeding the 18-credit limit"
    }
  ],
  "computedAt": "2026-04-01T10:05:00.000Z",
  "cached": false
}
```

**Example (cache hit):**

```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "computedAt": "2026-04-01T10:00:00.000Z",
  "cached": true
}
```

**Validation Logic:**

The validation engine processes entries in chronological order (year ASC, then W1 → W2 → S within each year) and checks:

1. **Prerequisites** — For each entry with status `"planned"` or `"in_progress"`, checks that all prerequisite rules are satisfied by courses with status `"completed"` in earlier terms. Supports recursive rule trees (`course`, `all_of`, `one_of`, `min_credits`).

2. **Credit overload** — Warns (does not error) when total credits in a term exceed:
   - 18 credits for regular terms (W1, W2)
   - 9 credits for summer term (S)

**Caching Behavior:**
- Results are cached in Redis with key `validation:{planId}`, TTL = 300 seconds (5 minutes).
- Cache is invalidated when: an entry is deleted (`deleteEntry`) or a plan is deleted (`deletePlan`).
- Cache is refreshed asynchronously when: an entry is added (`addEntry`) or updated (`updateEntry`) — these enqueue a BullMQ validation job.
- If Redis is unavailable, the endpoint computes validation synchronously but may fail to cache the result.

**Side Effects:**
- On cache miss: reads all entries for the plan and all courses from the database, then writes the result to Redis.
- Read-only from the caller's perspective.

**Dependencies:**
- Requires the plan to have entries for meaningful validation. An empty plan returns `{ valid: true, errors: [], warnings: [] }`.
- Requires courses to be seeded (the engine loads course data to check prerequisites and credit values).

---

## 8. Dependencies and Related Endpoints

### Endpoint Call Order

```
1. POST /api/v1/courses/seed     ← Must run first to populate course catalog
     ↓
2. POST /api/v1/plans            ← Create a plan
     ↓
3. POST /api/v1/plans/:id/entries  ← Add courses to the plan (repeat)
     ↓
4. GET /api/v1/plans/:id          ← Load the plan board
     ↓
5. PUT /api/v1/plans/:id/entries/:entryId   ← Move/update courses (drag-drop)
   PUT /api/v1/plans/:id/entries/reorder    ← Persist sort order after drag-drop
     ↓
6. GET /api/v1/plans/:id/validate  ← Check prerequisites and credit loads
```

### Cross-Endpoint Dependencies

| Endpoint                        | Depends On                                | Notes                                      |
|---------------------------------|-------------------------------------------|--------------------------------------------|
| `addEntry`                      | `seedCourses`, `createPlan`               | Course and plan must exist                 |
| `updateEntry`                   | `addEntry`                                | Entry must exist                           |
| `deleteEntry`                   | `addEntry`                                | Entry must exist                           |
| `reorderEntries`                | `addEntry`                                | Entries must exist                         |
| `validatePlan`                  | `createPlan`, `seedCourses` (for prereqs) | Returns valid=true if no entries           |
| `getPlan`                       | `createPlan`                              | Returns 404 if plan doesn't exist          |
| `deletePlan`                    | `createPlan`                              | Cascades to all entries                    |

### Infrastructure Dependencies

| Endpoint         | PostgreSQL | Redis  | BullMQ |
|------------------|-----------|--------|--------|
| `healthCheck`    | No        | No     | No     |
| `listCourses`    | Yes       | No     | No     |
| `getCourse`      | Yes       | No     | No     |
| `seedCourses`    | No*       | Yes    | Yes    |
| `listPlans`      | Yes       | No     | No     |
| `createPlan`     | Yes       | No     | No     |
| `getPlan`        | Yes       | No     | No     |
| `updatePlan`     | Yes       | No     | No     |
| `deletePlan`     | Yes       | Yes    | No     |
| `addEntry`       | Yes       | Yes    | Yes    |
| `updateEntry`    | Yes       | Yes    | Yes    |
| `deleteEntry`    | Yes       | Yes    | No     |
| `reorderEntries` | Yes       | No     | No     |
| `validatePlan`   | Yes       | Yes    | No     |

*`seedCourses` enqueues the job via Redis/BullMQ; the worker then writes to PostgreSQL.
