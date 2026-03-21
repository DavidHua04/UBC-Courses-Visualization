# UBC Degree Planner — Backend API Specification

Base URL: `http://localhost:3000`
All endpoints return JSON. All request bodies must use `Content-Type: application/json`.

---

## Common Types

### ApiError
```json
{
  "error": "string",       // machine-readable code
  "message": "string",     // optional human-readable description
  "fields": {              // optional field-level errors (validation only)
    "fieldName": "reason"
  }
}
```

### CourseRow
```json
{
  "id": "CPSC 110",
  "dept": "CPSC",
  "code": "110",
  "title": "Computation, Programs, and Programming",
  "credits": "4",
  "description": "string | null",
  "prerequisites": "PrerequisiteRule | null",
  "corequisites": ["CPSC 111"],
  "termsOffered": ["W1", "W2", "S"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### PrerequisiteRule (recursive union)
```typescript
type PrerequisiteRule =
  | { type: "course"; courseId: string; minGrade?: number }
  | { type: "all_of"; rules: PrerequisiteRule[] }
  | { type: "one_of"; rules: PrerequisiteRule[]; minCount?: number }
  | { type: "min_credits"; minCredits: number; from?: string[] }
```

### EntryRow
```json
{
  "id": "uuid",
  "planId": "uuid",
  "courseId": "CPSC 110",
  "year": 1,
  "term": "W1",
  "status": "planned",
  "position": 0
}
```

### PlanRow
```json
{
  "id": "uuid",
  "name": "My 4-Year Plan",
  "description": "string | null",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### PlanWithEntries (extends PlanRow)
```json
{
  "id": "uuid",
  "name": "My 4-Year Plan",
  "description": "string | null",
  "createdAt": "...",
  "updatedAt": "...",
  "entries": {
    "1": {
      "W1": [ /* EntryRow[] */ ],
      "W2": [ /* EntryRow[] */ ]
    },
    "2": {
      "S": [ /* EntryRow[] */ ]
    }
  }
}
```

### ValidationResult
```json
{
  "valid": true,
  "errors": [
    { "entryId": "uuid", "courseId": "CPSC 221", "message": "Missing prerequisite: CPSC 110" }
  ],
  "warnings": [
    { "entryId": "uuid", "courseId": "CPSC 213", "message": "..." }
  ],
  "computedAt": "2024-01-01T00:00:00.000Z",
  "cached": false
}
```

---

## Health

### `GET /api/health`

Returns server status.

**Response `200`**
```json
{ "status": "ok" }
```

---

## Courses

### `GET /api/v1/courses`

List courses with optional filtering and pagination.

**Query Parameters**

| Parameter | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `offset`  | number | `0`     | Number of records to skip |
| `limit`   | number | `20`    | Max records to return (capped at 100) |
| `dept`    | string | —       | Filter by department code (e.g. `CPSC`). Case-insensitive. |
| `level`   | number | —       | Filter by course level (e.g. `3` matches 3xx courses) |
| `q`       | string | —       | Full-text search across `id`, `title`, and `description` |

**Response `200`**
```json
{
  "data": [ /* CourseRow[] */ ],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 29
  }
}
```

**Response `500`**
```json
{ "error": "internal_error" }
```

---

### `GET /api/v1/courses/:id`

Get a single course by ID (e.g. `CPSC%20110`).

**Path Parameter**

| Parameter | Type   | Description |
|-----------|--------|-------------|
| `id`      | string | Course ID (case-insensitive, e.g. `cpsc 110` → `CPSC 110`) |

**Response `200`** — `CourseRow`

**Response `404`**
```json
{ "error": "not_found", "message": "Course not found" }
```

---

### `POST /api/v1/courses/seed`

Enqueues a background job to seed the database with 29 preset CPSC/MATH/STAT courses.

**Response `202`**
```json
{ "message": "Seed job enqueued", "jobId": "string" }
```

**Response `500`**
```json
{ "error": "internal_error" }
```

---

## Plans

### `GET /api/v1/plans`

List all plans with their entry count.

**Response `200`** — Array of `PlanRow` extended with `entryCount`:
```json
[
  {
    "id": "uuid",
    "name": "My Plan",
    "description": null,
    "createdAt": "...",
    "updatedAt": "...",
    "entryCount": 12
  }
]
```

---

### `POST /api/v1/plans`

Create a new plan.

**Request Body**
```json
{
  "name": "My 4-Year Plan",       // required
  "description": "Optional notes" // optional
}
```

**Response `201`** — `PlanRow`

**Response `400`**
```json
{
  "error": "validation_error",
  "message": "name is required",
  "fields": { "name": "required" }
}
```

---

### `GET /api/v1/plans/:id`

Get a plan with all entries grouped by year and term.

**Response `200`** — `PlanWithEntries`

Entries are sorted by `year ASC`, `term ASC`, `position ASC` within each group.

**Response `404`**
```json
{ "error": "not_found", "message": "Plan not found" }
```

---

### `PUT /api/v1/plans/:id`

Update a plan's name and/or description.

**Request Body** (all fields optional)
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response `204`** — No content

**Response `404`**
```json
{ "error": "not_found", "message": "Plan not found" }
```

---

### `DELETE /api/v1/plans/:id`

Delete a plan and all its entries. Also clears the Redis validation cache for the plan.

**Response `200`** — `PlanRow` (the deleted plan)

**Response `404`**
```json
{ "error": "not_found", "message": "Plan not found" }
```

---

## Plan Entries

### `POST /api/v1/plans/:id/entries`

Add a course to a plan.

**Request Body**
```json
{
  "courseId": "CPSC 110",  // required — case-insensitive
  "year": 1,               // required — integer 1–5
  "term": "W1",            // required — one of: "W1", "W2", "S"
  "status": "planned",     // optional — default "planned"
  "position": 0            // optional — auto-assigned if omitted
}
```

**Valid `status` values:** `planned` | `completed` | `failed` | `in_progress`

**Response `201`** — `EntryRow`

Triggers async prerequisite validation via BullMQ.

**Response `400`**
```json
{ "error": "validation_error", "message": "courseId, year, and term are required" }
```
```json
{ "error": "validation_error", "message": "term must be one of W1, W2, S" }
```
```json
{ "error": "validation_error", "message": "year must be between 1 and 5" }
```
```json
{ "error": "validation_error", "message": "Course CPSC 999 not found" }
```

**Response `404`**
```json
{ "error": "not_found", "message": "Plan not found" }
```

**Response `409`**
```json
{ "error": "conflict", "message": "Course already exists in this plan" }
```

---

### `PUT /api/v1/plans/:id/entries/:entryId`

Update an existing entry (move term/year, change status, update position).

**Request Body** (all fields optional)
```json
{
  "year": 2,
  "term": "W2",
  "status": "completed",
  "position": 3
}
```

**Response `204`** — No content

Triggers async prerequisite validation via BullMQ.

**Response `404`**
```json
{ "error": "not_found", "message": "Entry not found" }
```

---

### `DELETE /api/v1/plans/:id/entries/:entryId`

Remove a course from a plan. Clears the Redis validation cache for the plan.

**Response `200`** — `EntryRow` (the deleted entry)

**Response `404`**
```json
{ "error": "not_found", "message": "Entry not found" }
```

---

### `PUT /api/v1/plans/:id/entries/reorder`

Batch-update position values for multiple entries (used after drag-and-drop).

**Request Body**
```json
{
  "positions": [
    { "entryId": "uuid-1", "position": 0 },
    { "entryId": "uuid-2", "position": 1 },
    { "entryId": "uuid-3", "position": 2 }
  ]
}
```

**Response `204`** — No content

**Response `400`**
```json
{ "error": "validation_error", "message": "positions array is required" }
```

> **Note:** This route must be defined before `PUT /:id/entries/:entryId` in the router to avoid `reorder` being matched as an `entryId`.

---

## Plan Validation

### `GET /api/v1/plans/:id/validate`

Check whether all prerequisite rules are satisfied for every course in the plan. Results are cached in Redis and invalidated whenever entries are added, updated, or deleted.

**Response `200`** — `ValidationResult`
```json
{
  "valid": false,
  "errors": [
    {
      "entryId": "uuid",
      "courseId": "CPSC 221",
      "message": "Missing prerequisite: CPSC 110 must be completed before Year 2 W1"
    }
  ],
  "warnings": [],
  "computedAt": "2024-01-01T00:00:00.000Z",
  "cached": true
}
```

`cached: true` means the result was served from Redis. `cached: false` means it was computed on-demand and then stored.

**Response `404`**
```json
{ "error": "not_found", "message": "Plan not found" }
```

---

## Error Code Reference

| Code               | HTTP Status | Meaning |
|--------------------|-------------|---------|
| `not_found`        | 404         | Resource does not exist |
| `validation_error` | 400         | Invalid or missing request fields |
| `conflict`         | 409         | Duplicate entry (course already in plan) |
| `internal_error`   | 500         | Unhandled server error |
