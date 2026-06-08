# Implementation Plan: Results, Restart & Final Validation

**Branch**: `004-results-restart` | **Date**: 2026-06-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-results-restart/spec.md`

## Summary

Build the results screen (revealed secret word, final scores, full guess history) and a host-only restart action that resets the room back to lobby state, preserving participants. Non-host players auto-navigate back to lobby via polling. This closes the game loop, making the full round cycle playable end-to-end.

## Technical Context

**Language/Version**: TypeScript (Node.js 20 / React 18)

**Primary Dependencies**: Express (backend), React Router v6 (frontend), Zod (input validation)

**Storage**: In-memory `Map<string, Room>` in `roomStore.ts` — no database

**Testing**: Vitest (backend + frontend)

**Target Platform**: Local web server (backend port 3001, frontend Vite port 5173)

**Project Type**: Web application — Express REST API + React SPA

**Performance Goals**: Round-trip restart visible to all clients within ~2 s polling interval

**Constraints**: HTTP polling only (no WebSockets); no authentication; no database; TypeScript strict; no `any`

**Scale/Scope**: Small multiplayer sessions (~2–8 players per room); single active round per room

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| TypeScript-First | ✅ PASS | All new files are `.ts` / `.tsx`; no `any` |
| Zod at all system boundaries | ✅ PASS | `restartRoomSchema` added to `schemas.ts`; validated before service call |
| HTTP Polling only | ✅ PASS | Results page polls at 2 s; no WebSockets |
| In-Memory Storage only | ✅ PASS | `restartRoom()` mutates the in-memory `Map`; no persistence added |
| No Authentication | ✅ PASS | `participantId` UUID is identity only; host check is `room.hostId === participantId` |
| Immutability / Pure Functions | ✅ PASS | `restartRoom()` mutates within store, returns `structuredClone` |

No violations. Complexity Tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/004-results-restart/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/api.md     ← Phase 1 output
└── tasks.md             ← /speckit-tasks output (not created here)
```

### Source Code (changes only)

```text
backend/src/
├── models/game.ts               # no new fields — RoomStatus already has "round-ended"
├── api/schemas.ts               # + restartRoomSchema
├── services/roomStore.ts        # + restartRoom(); update toRoomSnapshot() word-reveal logic
└── api/rooms.ts                 # + POST /:code/restart route

frontend/src/
├── services/api.ts              # + restartRoom() method
├── pages/ResultsPage.tsx        # NEW — results display + restart button + polling
└── App.tsx                      # + /results route
```

## Phase 0: Research

### Decision 1: Revealing the secret word on the results screen

**Problem**: `toRoomSnapshot()` currently hides `secretWord` from non-drawers when `status === "in-progress"`. On the results screen all players must see the word.

**Decision**: Extend the existing `toRoomSnapshot(room, viewerParticipantId?)` logic with a status check. When `room.status === "round-ended"`, always set `secretWord = room.secretWord` regardless of viewer identity. The existing "drawer gets word, others get null" rule applies only during `"in-progress"`.

**Rationale**: Single-function change, consistent with the existing parameterised snapshot pattern, no new parameters needed. Alternatives considered: (a) a separate `toResultsSnapshot()` — rejected as duplication; (b) exposing raw room to the route — rejected as it breaks the viewer-personalisation pattern.

### Decision 2: Restart endpoint design

**Decision**: `POST /rooms/:code/restart` — body `{ participantId }`. Returns `{ room: RoomSnapshot }` of the reset lobby.

**Rationale**: POST is appropriate for a state-mutating action. Matches the convention of `/start`. Body carries `participantId` so the route can verify host identity without sessions.

**Guard order**: 404 (room not found) → 409 (room not in `"round-ended"` state) → 403 (caller is not host) → call `restartRoom()`.

### Decision 3: `restartRoom()` service function

**Decision**: Mutate in place within the Map:
```
room.status = "lobby"
room.strokes = []
room.guesses = []
room.scores = {}
room.drawerId = null
room.secretWord = null
room.updatedAt = now()
```
`participants` and `hostId` untouched. Returns `structuredClone(room)`.

**Rationale**: Mirrors `startRoom()` which mutates and clones. All state reset logic lives in the store, not the route handler.

### Decision 4: ResultsPage polling and navigation

**Decision**: `ResultsPage` polls every 2 000 ms. If `room.status === "lobby"`, navigate to `/lobby`. If room is 404, navigate to `/`. Guard entry: if no room in state OR `room.status !== "round-ended"`, redirect to `/` immediately on mount.

**Rationale**: Reuses the exact same polling/guard pattern as `LobbyPage` and `GamePage`. No new abstractions needed.
