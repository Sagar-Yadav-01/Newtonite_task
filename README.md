# Newtonite Operations — Operational Work-Management Platform

A reliable, full-stack internal operational work-management platform built for the **Newtonite Software Engineering Challenge**.

This application centralizes operational requests, issue investigations, approvals, and incident follow-ups across teams. It is specifically engineered to solve operational breakdowns caused by chat messages, spreadsheets, and emails by enforcing **strict server-side authorization**, **optimistic concurrency control (OCC)**, **atomic assignment race protection**, **race-safe idempotency**, **workflow state machine enforcement**, **transactional activity logging**, and **server-side search, filtering, and pagination**.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js `v18.0.0` or higher
- npm `v9.0.0` or higher

### 1. Installation & Setup
From the `newtonite` directory:
```bash
# Install server and client dependencies
npm run install:all
```

### 2. Database Initialization & Seeding
Initialize the zero-dependency SQLite database and seed demo operational data:
```bash
npm run db:push
npm run db:seed
```

### 3. Run Automated Tests
Run the 12 automated integration test suites (covering OCC 409 conflict, assignment race conditions, idempotency, authorization matrix, state machine rules, and transaction rollbacks):
```bash
npm test
```

### 4. Run Development Servers
Start both backend API server (`http://localhost:5000`) and React frontend (`http://localhost:5173`):
```bash
npm run dev
```

---

## 🔑 Demo Evaluator Credentials

The database seed script initializes three accounts for testing end-to-end scenarios:

| Role / User | Email | Password | Primary Team |
|---|---|---|---|
| **Global Admin** | `admin@newtonite.com` | `password123` | Global Access |
| **Rahul Sharma** | `rahul@newtonite.com` | `password123` | Payments Team |
| **Priya Patel** | `priya@newtonite.com` | `password123` | Engineering & Support Teams |

*Note: The login screen includes quick 1-click login buttons for all demo users.*

---

## 🛠️ Architecture & Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (Minimal, Linear/Notion inspired information hierarchy)
- **State Management**: TanStack Query (React Query v5) for server state & optimistic UI rollbacks
- **Routing**: React Router v6

### Backend
- **Runtime**: Node.js + Express.js + TypeScript
- **Validation**: Zod schema validation
- **ORM & Database**: Prisma ORM with SQLite (Development/Test) and PostgreSQL (Production via `docker-compose.yml`)
- **Authentication**: JWT (JSON Web Tokens) with `bcryptjs` password hashing

---

## 🔒 Security & Concurrency Guarantees

### 1. Server-Side Authorization Matrix
Authorization is enforced on every backend endpoint by querying the persisted database entity:
- **ADMIN**: Access to all teams and operations (privileged system role).
- **MEMBER**: Default role assigned to all public registrations. Access limited strictly to work items belonging to teams they are a member of. Ordinary members cannot elevate roles or modify user roles through any API endpoint (`403 Forbidden`).

### 2. Optimistic Concurrency Control (OCC)
- Every `WorkItem` contains an integer `version`.
- Updating an item passes the expected `version`.
- Conditional SQL update: `UPDATE WorkItem SET ..., version = version + 1 WHERE id = :id AND version = :expectedVersion`.
- If another user updated the item in the interim, server returns `409 Conflict`. Frontend rolls back optimistic state and prompts user to **[Refresh Item]**.

### 3. Atomic Assignment Race Protection
Claiming an unassigned work item uses atomic execution (`assigneeId = NULL` check). Under simultaneous claims (`Promise.all`), exactly 1 request receives `200 OK` and the second receives `409 Conflict`.

### 4. Idempotency & Duplicate Request Protection
`POST /api/work-items` supports `Idempotency-Key` headers. Uses `UNIQUE(userId, key)` DB constraints. Duplicate submissions return the cached HTTP 201 response.

---

## 📋 API Endpoints Summary

### Authentication & Users
- `POST /api/auth/register` — Register new user (always creates `MEMBER` accounts; client-provided role fields are ignored/stripped)
- `POST /api/auth/login` — Sign in & receive JWT
- `GET /api/auth/me` — Fetch current user profile
- `GET /api/users` — List all users
- `PATCH /api/users/:id` — Update user profile (`name` only; role modifications not allowed for ordinary members)

### Teams
- `GET /api/teams` — List teams with member counts
- `POST /api/teams` — Create new team (Admin)
- `GET /api/teams/:id/members` — List team members
- `POST /api/teams/:id/members` — Add team member (Admin)

### Work Items
- `GET /api/work-items` — Paginated, searched, filtered work items list
- `POST /api/work-items` — Create work item (supports `Idempotency-Key`)
- `GET /api/work-items/:id` — Work item details with comments and activity history
- `PATCH /api/work-items/:id` — Update work item (requires `version`)
- `POST /api/work-items/:id/assign` — Assign work item (requires `version`)
- `PATCH /api/work-items/:id/status` — Advance status (requires `version` & valid transition)
- `DELETE /api/work-items/:id` — Archive / soft-delete work item
- `GET /api/dashboard/summary` — Server-driven operational summary counts

---

## 🐳 PostgreSQL Production Deployment

To run PostgreSQL in production mode:
```bash
docker-compose up -d
```
Update `server/.env` to point `DATABASE_URL` to your PostgreSQL container:
```env
DATABASE_URL="postgresql://newtonite_user:newtonite_password@localhost:5432/newtonite_db?schema=public"
```
Then execute:
```bash
npm run db:push
```

---

## 📄 Documentation
- `ENGINEERING_DECISIONS.md` — Detailed analysis of data modeling, OCC, authorization, and trade-offs.
