# ENGINEERING_DECISIONS.md — Newtonite Operations Work-Management Platform

This document details the primary engineering decisions, architectural trade-offs, concurrency models, data consistency guarantees, and known limitations of the Newtonite operational system.

---

## 1. Decision 1: Dual Database Strategy & Data Modeling

### Context & Need
The platform must support instant evaluator setup (`npm run dev` and `npm test` without requiring local PostgreSQL installation) while remaining architecture-ready for multi-node enterprise PostgreSQL deployments.

### Chosen Architecture
- **Prisma ORM Layer**: Abstracts SQL dialect differences between SQLite and PostgreSQL.
- **Development & Testing**: Prisma configured with SQLite (`dev.db`). All unit, integration, and race-condition tests run out-of-the-box in milliseconds without external daemons.
- **Production & Deployment**: `docker-compose.yml` spins up a PostgreSQL 15 container alongside the backend API service. Switching to PostgreSQL requires only updating `DATABASE_URL` in `.env`.

### Trade-offs & Considerations
- **SQLite (Development & Evaluation Engine)**:
  - **Strengths**: Zero-dependency local setup, persistent local file (`server/prisma/dev.db`), instantaneous execution of unit/integration test suites without background daemons.
  - **Limitations**: Uses database file locking for writes. Under high concurrent production multi-writer workloads, SQLite can experience write lock contention or `SQLITE_BUSY` errors.
- **PostgreSQL (Production Deployment Option)**:
  - **Strengths**: True multi-process Row-Level MVCC locking, high-throughput concurrent write handling, support for connection pooling (e.g. PgBouncer), horizontal scale-out.
  - **Deployment**: Provided via `docker-compose.yml` (`postgres:15-alpine`). Setting `DATABASE_URL` to PostgreSQL targets this environment for production deployment.
  - Note: SQLite and PostgreSQL do NOT have identical runtime characteristics under heavy multi-writer concurrency. SQLite is intentionally used to optimize developer speed and self-contained evaluability.

---

## 2. Decision 2: Optimistic Concurrency Control (OCC) via Integer Versioning

### Business Problem
Operational work items undergo frequent simultaneous reads and edits by multiple team members. Silently overwriting newer updates with stale data causes critical work loss and conflicting instructions.

### Chosen Approach
- Every `WorkItem` entity maintains an integer `version` field (starts at 1).
- Every update request (`PATCH /api/work-items/:id`, status transitions, assignments) requires the client to supply the current `version`.
- Server performs an atomic conditional update:
  ```sql
  UPDATE WorkItem
  SET status = 'IN_PROGRESS', version = version + 1
  WHERE id = '123' AND version = 5;
  ```
- If 0 rows are affected (meaning another user incremented `version` to 6 in the interim), the server rejects the request with HTTP `409 Conflict`:
  ```json
  {
    "error": {
      "code": "VERSION_CONFLICT",
      "message": "This work item was modified by someone else.",
      "requestId": "req_8f1a"
    }
  }
  ```
- **Frontend Reconciliation**: The TanStack Query client intercepts `409` responses, rolls back optimistic state mutations, displays a non-destructive conflict modal, and provides a **"[Refresh Item]"** button to sync with latest server state.

---

## 3. Decision 3: Resource-Level Server-Side Authorization Matrix

### Architectural Constraint
Frontend button hiding is decorative. All security boundaries MUST be enforced on the backend by inspecting persisted database relations.

### Authorization Matrix
| Action | ADMIN | Team Member | Non-member | Response |
|---|---|---|---|---|
| View team work item | Yes | Yes | No | `403 Forbidden` |
| Create work item for team | Yes | Yes | No | `403 Forbidden` |
| Edit work item | Yes | Yes (own team) | No | `403 Forbidden` |
| Assign / Reassign work item | Yes | Yes (own team) | No | `403 Forbidden` |
| Change workflow status | Yes | Yes (own team) | No | `403 Forbidden` |
| Manage team members | Yes | No | No | `403 Forbidden` |
| Archive work item | Yes | Yes (creator / team) | No | `403 Forbidden` |

### Implementation Detail
Before performing any resource mutation, the server loads the persisted `WorkItem` from the database, retrieves its actual `teamId`, and checks `TeamMember` membership for `req.user.id`. The server never trusts client-supplied `teamId` headers or route params.

---

## 4. Decision 4: Transactional WorkItem & Activity Log Consistency

### Problem
If a status change or assignment persists on a WorkItem, but activity history creation fails (e.g. log table storage error), management loses auditability.

### Solution
All multi-entity mutations are executed inside `prisma.$transaction`:
```ts
return prisma.$transaction(async (tx) => {
  const updatedItem = await tx.workItem.updateMany({ ... });
  await tx.activityLog.create({ ... });
  return updatedItem;
});
```
If activity log creation fails, the entire transaction rolls back automatically, preventing partial commits. Activity history is treated as append-only (no update or delete endpoints exposed).

---

## 5. Decision 5: Race-Safe Idempotency Key Architecture

### Problem
Slow network connections or accidental user double-clicks can submit duplicate work creation requests.

### Solution
- Mutating endpoints (`POST /api/work-items`) accept an optional `Idempotency-Key` HTTP header.
- The `IdempotencyKey` model uses a database unique constraint: `UNIQUE(userId, key)`.
- **Identical Request & Key**: Returns the cached original response payload (HTTP 201).
- **Same Key, Different Payload**: Returns HTTP `409 Conflict` with `code: "IDEMPOTENCY_KEY_REUSED"`.
- **Response Synchronization**: The middleware awaits database persistence of the `IdempotencyKey` record before flushing the HTTP response to the client, preventing microsecond race conditions during duplicate retries.

---

## 6. Soft Deletion & Archiving Strategy

Work items are critical operational records and are never physically deleted from the database. Calling `DELETE /api/work-items/:id` sets `deletedAt = new Date()` and records a `WORK_ARCHIVED` event. All normal search, list, and detail queries filter out `deletedAt != null` items.

---

## 7. Pagination Strategy & Future Scaling

- **Current Implementation**: Server-side offset pagination (`page` + `pageSize`, capped at `pageSize = 100`).
- **Future Scaling**: For datasets exceeding 100,000 active work items, cursor-based pagination (e.g. `afterId` or timestamp cursors) will be implemented to prevent deep offset SQL query degradation.

---

## 8. Known Limitations

1. **No Enterprise Single Sign-On (SSO)**: Uses standard JWT authentication; SAML 2.0 / OIDC integrations are out of scope for MVP.
2. **Polling vs. Real-Time WebSockets**: Frontend relies on TanStack Query invalidation and manual refresh rather than a persistent WebSocket connection.
3. **In-Memory Rate Limiting**: Auth rate limiter uses local process memory rather than a distributed Redis cluster.

---

## 9. Decision 9: User Role Elevation Protection & Public Registration Scope

### Context & Security Vulnerability Audit
Public registration endpoints (`POST /api/auth/register`) must never allow self-selection of administrative privileges (`role = ADMIN`). Furthermore, user profile update endpoints (`PATCH /api/users/:id`) must not allow ordinary members to elevate their own role or promote other users to `ADMIN`.

### Chosen Architecture & Controls
- **Public Registration**: `registerSchema` accepts only `name`, `email`, and `password`. Public registration always creates `MEMBER` accounts. Administrative privileges are not self-selectable because accepting a client-provided role would create a privilege-escalation vulnerability.
- **User Updates**: `PATCH /api/users/:id` is validated via `updateUserSchema` which accepts non-security-sensitive fields (`name`). Non-admin attempts to modify `role` or update another user's profile are rejected with HTTP `403 Forbidden`.
- **Administrative Privileges**: `ADMIN` remains a pre-seeded, privileged system role for global administrative operations. Role changes are not available to ordinary members via any public API. The application does not require a role-promotion UI for the current assessment scope.
