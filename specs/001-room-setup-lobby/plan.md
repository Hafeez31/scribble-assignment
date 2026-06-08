# Implementation Plan: Room Setup & Lobby

**Branch**: `001-room-setup-lobby` | **Date**: 2026-06-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-room-setup-lobby/spec.md`

---

## Summary

Add host tracking, player name validation, a game-start endpoint, and automatic lobby
polling. The backend gains a `hostId` field on `Room`/`RoomSnapshot`, a required name
validation schema, and a new `POST /rooms/:code/start` endpoint. The frontend fixes the
API base URL bug, mirrors the updated types, and replaces the manual refresh button with
a 2-second polling loop that auto-navigates all players when the game starts.

---

## Technical Context

**Language/Version**: TypeScript 5.6.3 (backend + frontend)

**Primary Dependencies**: Express 4.21.1, Zod 3.23.8 (backend); React 18.3.1,
React Router DOM 6.30.1, Vite 5.4.10 (frontend)

**Storage**: In-memory `Map<string, Room>` in `backend/src/services/roomStore.ts`

**Testing**: Vitest 3.1.3 (both backend and frontend)

**Target Platform**: Node.js 22 server + browser SPA

**Project Type**: Web application (frontend + backend monorepo)

**Performance Goals**: Lobby polling at ~2 s interval; start-game propagation within one
polling cycle (~2 s)

**Constraints**: No WebSockets, no database, no authentication (per constitution)

**Scale/Scope**: Single-room sessions; in-memory only; no persistence across restarts

---

## Constitution Check

*GATE: Must pass before implementation. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. TypeScript-First | ✅ Pass | All new code in TypeScript; no `any` introduced |
| II. Zod Validation at Boundaries | ✅ Pass | `playerName` validated via Zod; new `startRoomSchema` added |
| III. HTTP Polling Only | ✅ Pass | Lobby uses `setInterval` + `fetch`; no WebSocket |
| IV. In-Memory Storage Only | ✅ Pass | All state stays in the `rooms` Map |
| V. No Authentication | ✅ Pass | `participantId` is identity only, not auth |
| VI. Immutability | ✅ Pass | `structuredClone` pattern retained in roomStore |

No violations. Complexity Tracking section not required.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-room-setup-lobby/
├── plan.md           ← this file
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
└── checklists/
    └── requirements.md
```

### Source Code — files changed by this feature

```text
backend/
└── src/
    ├── models/
    │   └── game.ts                  # expand RoomStatus, add hostId to Room + RoomSnapshot
    ├── api/
    │   ├── schemas.ts               # make playerName required (1-30), add startRoomSchema
    │   └── rooms.ts                 # update join handler (409 guard), add start handler
    └── services/
        └── roomStore.ts             # createRoom sets hostId, joinRoom checks status,
                                     # add startRoom(), toRoomSnapshot includes hostId

frontend/
└── src/
    ├── services/
    │   └── api.ts                   # fix base URL, update RoomSnapshot type, add startGame()
    ├── state/
    │   └── roomStore.ts             # add startGame() method
    └── pages/
        ├── LobbyPage.tsx            # replace manual refresh with auto-poll, host-only start,
        │                            # 404→redirect, in-progress→navigate to /game
        ├── CreateRoomPage.tsx       # add client-side name validation (1-30, trim)
        └── JoinRoomPage.tsx         # add client-side name + code validation
```

---

## Data Flow

### Create Room

```
CreateRoomPage
  → validate name (trim, 1-30) — client
  → POST /rooms { playerName }
  → backend: Zod validates name, createRoom() sets hostId = participant.id
  → response: { participantId, room: { ..., hostId, status: "lobby" } }
  → store: setRoomSession()
  → navigate /lobby
```

### Join Room

```
JoinRoomPage
  → validate name (trim, 1-30) + code (non-empty) — client
  → POST /rooms/:code/join { playerName }
  → backend: check room exists (404) + status == "lobby" (409), add participant
  → response: { participantId, room: { ..., hostId } }
  → store: setRoomSession()
  → navigate /lobby
```

### Lobby Polling (every 2 s)

```
LobbyPage (mounted)
  → setInterval: roomStore.fetchRoom()
    → GET /rooms/:code?participantId=...
    → 200 + status "lobby"  → update participant list, stay
    → 200 + status "in-progress" → navigate /game
    → 404                   → navigate / (room closed)
  → clearInterval on unmount
```

### Start Game

```
LobbyPage (host only, ≥2 participants)
  → click "Start Game"
  → roomStore.startGame()
    → POST /rooms/:code/start { participantId }
    → backend: check hostId match (403), count >= 2 (409), set status "in-progress"
    → response: { room: { status: "in-progress" } }
    → store: setRoomSnapshot()
    → navigate /game (host navigates immediately)
  → other players navigate via next poll tick
```

---

## File-Level Plan

### Backend

#### `backend/src/models/game.ts`
- Change `RoomStatus` from `"lobby"` to `"lobby" | "in-progress"`
- Add `hostId: string` to `Room`
- Add `hostId: string` to `RoomSnapshot`

#### `backend/src/api/schemas.ts`
- Replace `playerName: z.string().optional()` in `createRoomSchema` and `joinRoomSchema`
  with `playerName: z.string().trim().min(1).max(30)`
- Add `startRoomSchema = z.object({ participantId: z.string() })`

#### `backend/src/services/roomStore.ts`
- Remove `displayName()` fallback; name is now guaranteed non-empty by Zod
- `createRoom(playerName: string)`: set `room.hostId = participant.id`
- `joinRoom(code, playerName)`: before adding participant, check `room.status === "in-progress"`
  and throw `HttpError(409, "Game already in progress")`
- Add `startRoom(code, participantId)`: validates host + count, sets `status = "in-progress"`,
  returns `RoomSessionResponse`-like `{ room: RoomSnapshot }`
- `toRoomSnapshot()`: include `hostId: room.hostId` in returned object

#### `backend/src/api/rooms.ts`
- Update `POST /` handler: `playerName` no longer optional (Zod handles it)
- Update `POST /:code/join`: wrap `joinRoom` call — if it throws `HttpError`, pass to `next`;
  fix error message to `"Room not found"` (was `"Unable to join room"`)
- Add `POST /:code/start` handler: parse `startRoomSchema`, call `startRoom()`,
  return `{ room }` on 200

### Frontend

#### `frontend/src/services/api.ts`
- Fix `API_BASE_URL` fallback: remove `/bug` suffix → `"http://localhost:3001"`
- Update `RoomSnapshot.status` from `"lobby"` to `"lobby" | "in-progress"`
- Add `hostId: string` to `RoomSnapshot`
- Add `startGame(code: string, participantId: string)` method:
  `POST /rooms/:code/start { participantId }`

#### `frontend/src/state/roomStore.ts`
- Add `async startGame()`: calls `api.startGame(room.code, participantId)` inside
  `withLoading()`, then calls `setRoomSnapshot(response.room)`

#### `frontend/src/pages/LobbyPage.tsx`
- Remove manual `handleRefresh` / "Refresh Room" button
- Add `useEffect` with `setInterval(poll, 2000)` — clears on unmount
- Poll function: calls `roomStore.fetchRoom()`, on success checks
  `room.status === "in-progress"` → `navigate("/game")`;
  catches errors, if message includes "not found" or 404-shaped → `navigate("/")`
- Derive `isHost = room.hostId === participantId` from store state
- Show "Start Game" button only when `isHost`; disable when `participants.length < 2`
  with tooltip/label "Need at least 2 players"
- Non-host sees "Waiting for host to start…" in status card

#### `frontend/src/pages/CreateRoomPage.tsx`
- On submit: trim name, validate `length >= 1` and `length <= 30` before calling store
- Show inline error: "Name is required" / "Name must be 30 characters or fewer"

#### `frontend/src/pages/JoinRoomPage.tsx`
- On submit: trim name + trim code, validate both non-empty and name ≤ 30
- Show inline errors per field before any API call
