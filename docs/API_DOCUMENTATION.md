# Pest-Free Tracker API documentation

## 1. Overview

Pest-Free Tracker is a trap-management API for recording trap lines, traps, checks, catches, maintenance, inventory, field tasks and audit history.

- FastAPI application: `app/main.py`
- OpenAPI/Swagger: `/docs`
- ReDoc: `/redoc`
- OpenAPI JSON: `/openapi.json`
- Authentication: JSON Web Token (JWT), 8-hour expiry
- Default media type: `application/json`
- API prefix: none; routes begin with `/`

## 2. Base URLs

| Environment | Base URL | Verification status |
|---|---|---|
| Local development | `http://127.0.0.1:8000` | Defined by the README/Uvicorn command and `config.js`. |
| Deployed API | `https://pestfree-northland.onrender.com` | A URL referenced by project documentation; confirm that this service is still current before use. |
| API on another origin | Service origin configured in `frontend/admin/assets/js/config.js` | Manual configuration required. |

When the frontend is served by FastAPI, `config.js` uses the current origin for ports `80`/`443` and port `8000`. Otherwise it falls back to `http://127.0.0.1:8000`. CORS allows all origins and methods.

## 3. Authentication

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "replace-with-the-account-password"
}
```

Successful response:

```json
{
  "access_token": "example-redacted-token",
  "token_type": "bearer",
  "role": "coordinator"
}
```

Use the bearer token on protected endpoints:

```http
Authorization: Bearer <access_token>
```

The `/auth/token` endpoint is the OAuth2 form endpoint used by Swagger's Authorize button:

```text
username=<email>
password=<password>
grant_type=password
```

Protected endpoints return `401` if the token is missing, invalid or expired. They do not allow anonymous access.

## 4. Authorization levels

| Level | Access |
|---|---|
| Signed-in user | Authentication, own profile, lines/traps available to the account, checks/catches, tasks assigned to that account, line assignments, and notification topic. |
| Volunteer | Access is limited by backend rules and the frontend menu. Can see permitted trap locations and record checks/catches. |
| Field worker | Frontend access is limited to Field check, Field tasks and Sync status. Backend `/auth/me`, own tasks and checks/catches are available. Non-worker trap history and catches-list routes reject this role. |
| Coordinator | Full management routes: traps, trap lines, users, reports, inventory, QR pages, audit, imports, assignments and notification testing. |

The `require_non_field_worker` dependency rejects field workers on routes requiring it. Public registration creates only volunteers unless a trusted coordinator creates or edits a user through the coordinator endpoint.

## 5. Endpoint index

### Health

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Basic application health check. |

### Authentication

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Register an account; Render only permits volunteer roles. |
| GET | `/auth/registration-status` | Public | Returns `{ "enabled": true }`. |
| POST | `/auth/login` | Public | JSON login. |
| POST | `/auth/token` | Public | OAuth2 form login for Swagger. |
| GET | `/auth/me` | Signed in | Return the current profile. |

### Users

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/users` | Coordinator | List users. |
| POST | `/users` | Coordinator | Create a user, including a field-worker or coordinator account. |
| PUT | `/users/{user_id}` | Coordinator | Replace editable profile fields and role. |
| DELETE | `/users/{user_id}` | Coordinator | Delete a user with no recorded checks. Own account cannot be deleted. |
| PATCH | `/users/{user_id}/location-access` | Coordinator | Enable or disable exact-location visibility. |
| PUT | `/users/me/notification-topic` | Signed in | Set or clear a private ntfy topic. |

### Trap lines and traps

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/trap-lines` | Coordinator | Create a trap line. |
| GET | `/trap-lines` | Signed in | List trap lines. |
| PUT | `/trap-lines/{line_id}` | Coordinator | Update line name and area. |
| DELETE | `/trap-lines/{line_id}` | Coordinator | Delete a line. |
| POST | `/trap-lines/{line_id}/traps` | Coordinator | Create a trap. |
| GET | `/trap-lines/{line_id}/traps` | Signed in | List traps on a line with role-filtered locations. |
| PUT | `/traps/{trap_id}` | Coordinator | Update a trap. |
| DELETE | `/traps/{trap_id}` | Coordinator | Delete a trap and its checks/catches/maintenance. |

### Checks, catches and maintenance

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/traps/{trap_id}/checks` | Signed in | Record a trap check. |
| GET | `/traps/{trap_id}/checks` | Volunteer/coordinator | List checks. |
| GET | `/traps/{trap_id}/history` | Volunteer/coordinator | Combined check/history view including catch species. |
| GET | `/traps/{trap_id}/maintenance` | Volunteer/coordinator | List maintenance records. |
| POST | `/traps/{trap_id}/maintenance` | Coordinator | Add maintenance notes. |
| POST | `/checks/{check_id}/catches` | Signed in | Attach a catch to an existing check. |
| GET | `/catches` | Volunteer/coordinator | List catches with trap context. |
| POST | `/catches` | Signed in | Create a check and catch together. |
| PUT | `/catches/{catch_id}` | Coordinator | Update catch species. |
| DELETE | `/catches/{catch_id}` | Coordinator | Delete a catch. |

The catch list response includes `trap_code`, `trap_line_id`, `trap_line`, and `recorded_by` in addition to the catch fields. The create/update/delete response examples use `CatchOut` and therefore omit those list-only fields.

### Reports, inventory and audit

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/reports/catches?group=line\|month` | Coordinator | Aggregated catch report. |
| GET | `/inventory` | Coordinator | List inventory. |
| POST | `/inventory` | Coordinator | Create an inventory item. |
| PUT | `/inventory/{item_id}` | Coordinator | Update item metadata; existing quantity is preserved. |
| POST | `/inventory/{item_id}/movements` | Coordinator | Add or subtract stock. |
| GET | `/audit` | Coordinator | List audit events, optionally filtered. |

### Tasks and line assignments

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/tasks` | Signed in | Coordinators receive all tasks; workers receive assigned tasks only. |
| POST | `/tasks` | Coordinator | Create a task. |
| PATCH | `/tasks/{task_id}` | Assigned user/coordinator | Mark open or completed. |
| GET | `/trap-lines/{line_id}/assignments` | Coordinator | List assignments for a line. |
| GET | `/my/trap-line-assignments` | Signed in | List assignments for the current user. |
| POST | `/trap-lines/{line_id}/assignments` | Coordinator | Assign a volunteer or field worker to a line. |
| DELETE | `/trap-line-assignments/{assignment_id}` | Coordinator | Remove an assignment. |

### Imports and notifications

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/imports/traps` | Coordinator | Import or optionally update up to 500 traps. |
| GET | `/notifications/info` | Volunteer/coordinator | Return configured ntfy server/topic URL. |
| POST | `/notifications/test` | Coordinator | Send a test ntfy notification. |

### Database backups

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/backups/create` | Coordinator or `X-Backup-Cron-Key` | Create a compressed JSON database snapshot and retain the configured number of files. |
| GET | `/backups` | Coordinator | List backup filenames, timestamps and sizes. |
| GET | `/backups/{filename}` | Coordinator | Download a backup ZIP containing personal and exact-location data. |

## 6. Request and response examples

### Health

```http
GET /health
```

```json
{ "status": "ok" }
```

### Public registration

```json
{
  "name": "Sample Volunteer",
  "email": "sample@example.com",
  "password": "replace-with-a-valid-password",
  "role": "volunteer"
}
```

Response `201`:

```json
{
  "id": 1,
  "name": "Sample Volunteer",
  "email": "sample@example.com",
  "role": "volunteer",
  "can_view_exact_location": false,
  "has_notification_topic": false
}
```

On Render, a role of `coordinator` is rejected with `403`. Hosted public registration is volunteer-only.

### Trap line

```json
{ "name": "Bream Head Track", "general_area": "Whangarei Heads" }
```

```json
{
  "id": 1,
  "name": "Bream Head Track",
  "general_area": "Whangarei Heads",
  "created_at": "2026-10-28T12:00:00"
}
```

### Trap

```json
{
  "code": "BH-01",
  "trap_type": "rat",
  "general_area": "Whangarei Heads",
  "exact_lat": -35.8393,
  "exact_lng": 174.559,
  "is_sensitive": false,
  "status": "active",
  "inspection_interval_days": 14
}
```

Response `201`:

```json
{
  "id": 1,
  "trap_line_id": 1,
  "code": "BH-01",
  "trap_type": "rat",
  "recommended_bait": "Peanut butter or chocolate",
  "general_area": "Whangarei Heads",
  "is_sensitive": false,
  "status": "active",
  "inspection_interval_days": 14,
  "exact_lat": -35.8393,
  "exact_lng": 174.559,
  "last_status": null,
  "last_checked_at": null
}
```

Trap `code` may be omitted when creating/updating; omitted values are generated or preserved by the implementation. Sensitive traps require both exact coordinates. Exact coordinates are omitted for an account that is not a coordinator and does not have `can_view_exact_location=true`.

### Trap check and catch

```json
{ "status": "empty", "notes": "Clear and reset", "checked_at": null }
```

Response `201`:

```json
{
  "id": 1,
  "trap_id": 1,
  "user_id": 2,
  "checked_at": "2026-10-28T12:00:00",
  "status": "empty",
  "notes": "Clear and reset"
}
```

Attach a catch to that check:

```http
POST /checks/1/catches

{ "species": "rat" }
```

Alternatively, create both in one call:

```json
{
  "trap_id": 1,
  "species": "rat",
  "notes": "Caught during routine inspection",
  "checked_at": null
}
```

Catch response `201`:

```json
{
  "id": 1,
  "check_id": 1,
  "trap_id": 1,
  "species": "rat",
  "recorded_at": "2026-10-28T12:00:00"
}
```

### Maintenance

```json
{ "notes": "Replaced the spring", "performed_at": null }
```

```json
{
  "performed_at": "2026-10-28T12:00:00",
  "notes": "Replaced the spring",
  "recorded_by": "Coordinator Name"
}
```

### Inventory

Create:

```json
{
  "name": "Fresh Possum Lure",
  "category": "bait",
  "unit": "packs",
  "quantity": 18,
  "reorder_level": 12
}
```

Response:

```json
{
  "id": 1,
  "name": "Fresh Possum Lure",
  "category": "bait",
  "unit": "packs",
  "quantity": 18,
  "reorder_level": 12,
  "needs_reorder": false,
  "created_at": "2026-10-28T12:00:00"
}
```

Adjust stock:

```json
{ "quantity_change": -6, "reason": "Issued to Bream Head Track" }
```

Positive values restock; negative values issue or use stock. Zero changes and changes that make quantity negative are rejected.

### Field task

```json
{
  "trap_id": 1,
  "trap_line_id": 1,
  "assigned_to": 2,
  "title": "Reset BH-01 and replace lure",
  "notes": "Confirm the trap is stable.",
  "due_at": "2026-10-29T23:59:59Z"
}
```

The assignee must be volunteer or field-worker. If `trap_id` is supplied with `trap_line_id`, the trap must belong to that line. Status update:

```json
{ "status": "completed" }
```

Allowed statuses are `open` and `completed`.

### Trap-line assignment

```json
{ "user_id": 2 }
```

### Audit

```text
GET /audit?entity_type=trap&entity_id=1&limit=100
```

`entity_type` accepts `trap`, `user`, `catch`, or `trap_line`. `entity_id` is at least 1 and `limit` is 1–500. Audit entries include actor, action, entity identity and optional before/after JSON objects.

### Report

```text
GET /reports/catches?group=line
```

```json
{
  "group": "line",
  "total": 5,
  "rows": [
    { "label": "Bream Head Track", "catches": 3 },
    { "label": "Mair Park Loop", "catches": 2 }
  ]
}
```

The frontend additionally filters and exports broader report views, but only `/reports/catches` is an API endpoint.

### Trap import

```json
{
  "rows": [
    {
      "trap_line": "Bream Head Track",
      "code": "BH-04",
      "trap_type": "mouse",
      "general_area": "Whangarei Heads",
      "exact_lat": -35.84,
      "exact_lng": 174.56,
      "is_sensitive": false,
      "status": "active",
      "inspection_interval_days": 14
    }
  ],
  "update_existing": false
}
```

Response:

```json
{ "created": 1, "updated": 0, "errors": [] }
```

If validation/import checks find errors, `created` and `updated` remain zero and `errors` contains row messages.

### Notification test

```json
{ "title": "Test alert", "message": "Notifications are working." }
```

```json
{ "ok": true }
```

## 7. Validation rules

### Common value rules

- Password: 8–64 characters.
- Name: 2–80 characters.
- Email: `^[^@\s]+@[^@\s]+\.[^@\s]+$`, maximum 120 characters.
- Trap-line name: 2–80 characters.
- Trap-line general area: 2–120 characters.
- Trap code: 1–30 characters when supplied; a code is generated if omitted.
- Exact latitude: -90 through 90.
- Exact longitude: -180 through 180.
- Inspection interval: 1–365 days; default 14.
- Inventory name: 2–80 characters; unit: 1–20 characters.
- Inventory quantity/reorder level: 0–1,000,000.
- Stock change: -1,000,000 through 1,000,000; not zero.
- Movement reason: 2–200 characters.
- Check notes: maximum 500 characters.
- Catch/check notes: maximum 500 characters.
- Maintenance notes: 2–500 characters.
- Task title: 2–120 characters; notes maximum 500 characters.
- Private notification topic: 16–100 characters using letters, numbers, underscores or hyphens.
- Trap import: 1–500 rows.

Allowed enum values:

- Roles: `volunteer`, `field_worker`, `coordinator`
- Public registration roles: `volunteer`, `coordinator` (though Render blocks coordinator registration)
- Check status: `empty`, `caught`, `bait_needed`, `sprung`
- Trap status: `active`, `needs_bait`, `damaged`, `missing`, `under_maintenance`
- Trap/catch species: `possum`, `rat`, `stoat`, `mouse`, `hedgehog`, `other`
- Inventory category: `bait`, `equipment`, `maintenance`, `other`
- Task status: `open`, `completed`
- Report group: `line`, `month`
- Audit entity type: `trap`, `user`, `catch`, `trap_line`

## 8. Status codes and errors

| Status | Meaning |
|---|---|
| 200 | Successful request. |
| 201 | Resource created. |
| 204 | Successful deletion; no response body. |
| 400 | Invalid operation or state. |
| 401 | Missing, invalid or expired token. |
| 403 | Valid identity lacks authorization. |
| 404 | Resource not found. |
| 409 | Duplicate or conflicting data. |
| 422 | Pydantic/FastAPI request validation failure. |
| 429 | ntfy rate limit. |
| 500 | Server-side configuration or processing failure. |
| 502 | ntfy connection or upstream failure. |
| 503 | Notification configuration unavailable. |

Application errors use:

```json
{ "detail": "Human-readable reason" }
```

FastAPI validation errors use a `detail` array describing the field, location and validation message.

## 9. Database models and relationships

- `users`: authentication, role and exact-location permission.
- `trap_lines.created_by -> users.id`.
- `traps.trap_line_id -> trap_lines.id`.
- `trap_checks.trap_id -> traps.id` and `trap_checks.user_id -> users.id`.
- `catches.check_id -> trap_checks.id` and `catches.trap_id -> traps.id`.
- `trap_maintenance.trap_id -> traps.id` and `trap_maintenance.user_id -> users.id`.
- `inventory_movements.item_id -> inventory_items.id` and `inventory_movements.user_id -> users.id`.
- `field_tasks.trap_id -> traps.id`, `field_tasks.trap_line_id -> trap_lines.id`, `assigned_to -> users.id`, `assigned_by -> users.id`.
- `trap_line_assignments.trap_line_id -> trap_lines.id`, `user_id -> users.id`, `assigned_by -> users.id`.
- `audit_logs.actor_id` records the actor ID but is not declared as a database foreign key.

Deleting through API routes may have additional application checks. For example, deleting a trap removes its related checks/catches/maintenance, and deleting a user is refused if that user has recorded checks.

## 10. File uploads and images

No file or image upload endpoints are implemented. Trap, catch and maintenance records use JSON bodies only. The frontend does not provide a photo-upload control. QR codes are generated in the browser and contain a trap-check URL; the server does not upload or store those images.

## 11. CORS and troubleshooting

The backend allows origins `*`, all methods and all headers. This permits API-hosted browser clients, but credentials are still controlled through bearer tokens rather than browser cookies.

Common errors:

- `401`: log in again or confirm the bearer token has not expired.
- `403`: use a coordinator account or ensure the route supports the current role.
- `422`: inspect field names and enum values against this document.
- `404`: confirm IDs and route spelling.
- CORS failure: confirm the frontend is calling the correct origin and HTTPS is used on hosted devices. CORS is permissive in code, so browser failures may instead indicate DNS, TLS, a service outage or proxy routing.
- Exact locations absent: the account is neither coordinator nor approved for exact-location visibility.
- `503` from notifications: server notification configuration is missing.

## 12. Testing with Swagger and ReDoc

1. Open `/docs` on the chosen server.
2. Locate `POST /auth/login`, submit JSON credentials and copy `access_token`.
3. Select **Authorize**, enter `Bearer <access_token>` as the token and confirm.
4. Open a protected endpoint and run **Try it out**.
5. Inspect status, response body and curl command in Swagger.
6. Open `/redoc` for read-only navigation of schemas.

Swagger's OAuth2 form endpoint can also be used through the green Authorize control.

### curl examples

Login:

```bash
curl -X POST "http://127.0.0.1:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"replace-with-password"}'
```

Authenticated request:

```bash
curl -X GET "http://127.0.0.1:8000/trap-lines" \
  -H "Authorization: Bearer <access_token>"
```

Create a trap (coordinator only):

```bash
curl -X POST "http://127.0.0.1:8000/trap-lines/1/traps" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"trap_type":"rat","general_area":"Northland","inspection_interval_days":14}'
```

## 13. API documentation maintenance

Route definitions are in `app/api/*.py`; validation models are in `app/schemas.py`; database models are in `app/db/models.py`. The FastAPI `/openapi.json` schema should be treated as the runtime authority. This document was checked against the route decorators and schemas. Notification delivery, HTTPS access and a live hosted database should be confirmed manually on the deployment.
