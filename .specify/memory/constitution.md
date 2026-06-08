<!--
SYNC IMPACT REPORT
==================
Version change: (template) → 1.0.0
Modified principles: All — initial population from template placeholders
Added sections:
  - Core Principles (I–VI)
  - Hard Constraints (non-negotiable forbidden patterns)
  - Development Workflow
  - Governance
Templates reviewed:
  - .specify/templates/plan-template.md ✅ no changes required; Constitution Check section already present
  - .specify/templates/spec-template.md ✅ no changes required; structure compatible
  - .specify/templates/tasks-template.md ✅ no changes required; structure compatible
Deferred TODOs: none
-->

# Scribble Constitution

## Core Principles

### I. TypeScript-First (NON-NEGOTIABLE)

All code — new and modified — MUST be fully typed TypeScript.
Using `any` is forbidden; use `unknown` for truly dynamic values and
narrow with type guards. Both `backend/` and `frontend/` are strict TypeScript projects;
compilation errors MUST be resolved before committing.

### II. Zod Validation at All System Boundaries

Every inbound request on the backend MUST be validated with a Zod schema
before the data reaches service or business logic.
Schemas live in `backend/src/api/schemas.ts`.
The `HttpError` class MUST be used for domain-level errors (e.g. 404 Room not found)
so the global error handler in `backend/src/api/router.ts` handles them uniformly.
Frontend input validation is handled via controlled form state; no Zod on the client.

### III. HTTP Polling Only — No Real-Time Push (NON-NEGOTIABLE)

WebSockets, Socket.io, Server-Sent Events, and any other real-time push protocol
are strictly forbidden. All state synchronisation between client and server
MUST use HTTP polling. Polling intervals are feature-defined (e.g. ~2 s for lobby).

### IV. In-Memory Storage Only — No Databases (NON-NEGOTIABLE)

No database of any kind (SQL, NoSQL, SQLite, Redis, file-based persistence, etc.)
may be introduced. All application state lives in the in-memory `Map` inside
`backend/src/services/roomStore.ts`. Inactive rooms MUST be cleaned up explicitly
to keep the memory footprint minimal.

### V. No Authentication or Sessions (NON-NEGOTIABLE)

Authentication, sessions, JWTs, OAuth, cookies, and any form of identity management
are out of scope and MUST NOT be added. Player identity is expressed via the
`participantId` UUID returned at room creation / join and held in client-side state only.

### VI. Immutability and Pure Functions

Prefer immutable data structures. Use `structuredClone()` when copying stored objects.
Write pure, side-effect-free functions where possible. Mutation of shared state MUST
be isolated to the store layer (`roomStore.ts`) and never happen in route handlers or
service call sites.

## Hard Constraints

These are absolute rules derived from AGENTS.md. No exception requires a plan amendment
AND explicit sign-off before any implementation proceeds.

| Constraint | Detail |
|------------|--------|
| No WebSockets | Including Socket.io, SSE, long-polling upgrades |
| No Databases | Including SQLite, Prisma, any ORM |
| No Authentication | Including sessions, JWT, OAuth, cookies |
| No `any` in TypeScript | Use `unknown` + type guards instead |
| No direct state mutation outside store | Route handlers are read-only consumers |

## Development Workflow

**Running locally:**
- Backend: `cd backend && npm run dev` (port 3001)
- Frontend: `cd frontend && npm run dev` (Vite default port 5173)
- Frontend MUST set `VITE_API_URL` to the correct backend origin (e.g. `http://localhost:3001`)

**Project layout conventions:**
- Backend routes → `backend/src/api/`
- Backend business logic → `backend/src/services/`
- Backend types → `backend/src/models/`
- Frontend pages → `frontend/src/pages/`
- Frontend shared components → `frontend/src/components/`
- Frontend state → `frontend/src/state/`
- Frontend API client → `frontend/src/services/api.ts`

**Reuse before create:** Always extend existing patterns (store methods, Zod schemas,
component props) before introducing new abstractions. Three similar lines is better
than a premature abstraction.

**Feature branches:** Use the Speckit feature branch convention (`###-feature-name`)
created by `/speckit-git-feature` before each specification phase.

## Governance

- This constitution supersedes all other informal practices.
- Any amendment requires: a documented rationale, a version bump following
  MAJOR.MINOR.PATCH semver (MAJOR = principle removal/redefinition,
  MINOR = new principle or section, PATCH = clarification/wording), and
  re-running this command to propagate changes to templates.
- All implementation plans MUST include a Constitution Check section that
  gates Phase 0 research. Violations MUST be justified in the Complexity
  Tracking table before work begins.
- Spec, plan, and task reviews MUST verify that no forbidden pattern
  (WebSocket, database, auth, `any`) appears in proposed changes.
- Runtime guidance for agents: `AGENTS.md` (checked into repo root).

**Version**: 1.0.0 | **Ratified**: 2026-06-08 | **Last Amended**: 2026-06-08
