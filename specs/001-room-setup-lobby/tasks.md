---
description: "Task list for Room Setup & Lobby"
---

# Tasks: Room Setup & Lobby

**Input**: Design documents from `specs/001-room-setup-lobby/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | contracts/api.md ✅ | research.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths included in all descriptions

## Path Conventions

- Backend source: `backend/src/`
- Frontend source: `frontend/src/`

---

## Phase 1: Setup

**Purpose**: Fix the blocking API bug so all subsequent work is testable end-to-end.

- [x] T001 Fix `API_BASE_URL` fallback in `frontend/src/services/api.ts` — change `"http://localhost:3001/bug"` to `"http://localhost:3001"`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type and schema changes that every user story depends on.

**⚠️ CRITICAL**: All three tasks can run in parallel. No user story work begins until this phase is complete.

- [x] T002 [P] Expand `RoomStatus` to `"lobby" | "in-progress"` and add `hostId: string` to `Room` and `RoomSnapshot` interfaces in `backend/src/models/game.ts`
- [x] T003 [P] Mirror model changes in `frontend/src/services/api.ts` — add `hostId: string` to `RoomSnapshot` and expand `status` type to `"lobby" | "in-progress"`
- [x] T004 [P] Update `createRoomSchema` and `joinRoomSchema` in `backend/src/api/schemas.ts` — replace `z.string().optional()` with `z.string().trim().min(1).max(30)` for `playerName`; add `startRoomSchema = z.object({ participantId: z.string() })`

**Checkpoint**: Types and schemas updated — user story implementation can now begin.

---

## Phase 3: User Story 1 — Host Creates a Room (Priority: P1) 🎯 MVP

**Goal**: Player provides a valid name, creates a room, and lands in the lobby as the host.

**Independent Test**: Create a room with name "Alice" → verify lobby shows Alice listed, `room.hostId` equals Alice's `participantId`.

### Implementation for User Story 1

- [x] T005 [US1] Update `createRoom()` in `backend/src/services/roomStore.ts` — remove `displayName()` fallback (name now guaranteed by Zod), set `room.hostId = participant.id`
- [x] T006 [US1] Update `toRoomSnapshot()` in `backend/src/services/roomStore.ts` — include `hostId: room.hostId` in the returned `RoomSnapshot` object
- [x] T007 [US1] Add client-side name validation to `frontend/src/pages/CreateRoomPage.tsx` — trim input, block submission if empty or > 30 chars, show inline error "Name is required" / "Name must be 30 characters or fewer"

**Checkpoint**: User Story 1 fully functional — room creation, host assignment, and name validation all work independently.

---

## Phase 4: User Story 2 — Guest Joins a Room (Priority: P1)

**Goal**: Player enters a room code and name to join an existing lobby; invalid inputs and in-progress rooms are rejected clearly.

**Independent Test**: With an existing room, join as "Bob" → verify Bob appears in the participant list. Test with unknown code (expect 404 error), with empty name (expect client error), and with a started room (expect 409 error).

### Implementation for User Story 2

- [x] T008 [US2] Update `joinRoom()` in `backend/src/services/roomStore.ts` — add guard: if `room.status === "in-progress"` throw `new HttpError(409, "Game already in progress")` before adding participant
- [x] T009 [US2] Update `POST /:code/join` handler in `backend/src/api/rooms.ts` — update not-found message from `"Unable to join room"` to `"Room not found"`; ensure `HttpError` from `joinRoom` propagates via `next(error)`
- [x] T010 [US2] Add client-side validation to `frontend/src/pages/JoinRoomPage.tsx` — trim both name and code fields; block submission with per-field inline errors: "Name is required" / "Name must be 30 characters or fewer" / "Room code is required"

**Checkpoint**: User Stories 1 and 2 both independently testable — full create and join flows validated.

---

## Phase 5: User Story 3 — Lobby Auto-Updates (Priority: P2)

**Goal**: Participant list refreshes automatically every ~2 seconds; all players auto-navigate to `/game` when the room status becomes `"in-progress"`.

**Independent Test**: Open two tabs in the same lobby — joining on one tab causes the new participant to appear on the other within ~2 seconds, with no manual action.

### Implementation for User Story 3

- [x] T011 [P] [US3] Add `startGame(code: string, participantId: string)` method to `frontend/src/services/api.ts` — `POST /rooms/${code}/start` with body `{ participantId }`; return type `{ room: RoomSnapshot }`
- [x] T012 [P] [US3] Add `async startGame()` method to `frontend/src/state/roomStore.ts` — calls `api.startGame(room.code, participantId)` inside `withLoading()`, calls `setRoomSnapshot(response.room)` on success
- [x] T013 [US3] Replace manual refresh with auto-polling in `frontend/src/pages/LobbyPage.tsx` — add `useEffect` with `setInterval` at 2000 ms calling `roomStore.fetchRoom()`; clear interval on unmount; remove the manual "Refresh Room" button and `handleRefresh` handler
- [x] T014 [US3] Handle poll results in `frontend/src/pages/LobbyPage.tsx` — if fetched `room.status === "in-progress"` call `navigate("/game")`; if fetch throws with "not found" message call `navigate("/")` to signal room closed (depends on T013)

**Checkpoint**: Lobby auto-refreshes every 2 s and navigates all players to the game page when status changes.

---

## Phase 6: User Story 4 — Host Starts the Game (Priority: P2)

**Goal**: Host can start the game when ≥ 2 players are present; non-hosts cannot start; all players are transported via polling.

**Independent Test**: With 2 players in the lobby, only the host's tab shows an active "Start Game" button; clicking it sets room status to `"in-progress"` and the host navigates to `/game` immediately.

### Implementation for User Story 4

- [x] T015 [US4] Implement `startRoom(code: string, participantId: string)` in `backend/src/services/roomStore.ts` — return `HttpError(404)` if room not found; `HttpError(403, "Only the host can start the game")` if `participantId !== room.hostId`; `HttpError(409, "Game already in progress")` if `status === "in-progress"`; `HttpError(409, "At least 2 players are required to start")` if `participants.length < 2`; otherwise set `room.status = "in-progress"`, save, and return `{ room: toRoomSnapshot(room) }`
- [x] T016 [US4] Add `POST /:code/start` route handler in `backend/src/api/rooms.ts` — parse `startRoomSchema`, call `startRoom(code.toUpperCase(), participantId)`, return `200 { room }` on success; errors propagate via `next(error)`
- [x] T017 [US4] Add host-only "Start Game" UI to `frontend/src/pages/LobbyPage.tsx` — derive `isHost = room.hostId === participantId`; render "Start Game" button only when `isHost`; disable with label "Need at least 2 players" when `room.participants.length < 2`; on click call `roomStore.startGame()` then `navigate("/game")`; non-host sees "Waiting for host to start…" in the status card

**Checkpoint**: All four user stories independently functional. Full feature complete.

---

## Phase 7: Polish & Validation

**Purpose**: Verify the complete feature against the quickstart scenarios.

- [x] T018 [P] Run backend tests: `cd backend && npm test` — confirm all existing tests pass with the model and schema changes
- [x] T019 [P] Run frontend tests: `cd frontend && npm test` — confirm all existing tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — T002, T003, T004 can run in parallel
- **US1 (Phase 3)**: Depends on Phase 2 completion — T005 → T006 (sequential, same file); T007 [P] with T005+T006
- **US2 (Phase 4)**: Depends on Phase 2 completion — T008 → T009 (sequential, same service then route); T010 [P]
- **US3 (Phase 5)**: Depends on Phase 2 — T011 [P] T012 [P]; then T013 → T014 (sequential, same file)
- **US4 (Phase 6)**: Depends on Phase 2 — T015 → T016 (service before route); T017 [P] with T015+T016 once T013 is done
- **Polish (Phase 7)**: Depends on all phases complete — T018 [P] T019 [P]

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories
- **US2 (P1)**: No dependency on other stories; can run in parallel with US1
- **US3 (P2)**: Depends on Phase 2; polling navigation fully testable only after US4 backend (T015, T016)
- **US4 (P2)**: Depends on Phase 2; backend (T015, T016) should complete before US3's T014

### Within Each Phase

- Models/types before services
- Services before route handlers
- Route handlers before frontend integration
- Same-file tasks are sequential; different-file tasks marked [P] can be parallel

### Parallel Opportunities

```bash
# Phase 2 — all three run together:
T002  backend/src/models/game.ts
T003  frontend/src/services/api.ts
T004  backend/src/api/schemas.ts

# Phase 3 — T007 independent of T005+T006:
T005+T006  backend/src/services/roomStore.ts
T007       frontend/src/pages/CreateRoomPage.tsx

# Phase 4 — T010 independent of T008+T009:
T008+T009  backend (service + route)
T010       frontend/src/pages/JoinRoomPage.tsx

# Phase 5 — T011 and T012 independent:
T011  frontend/src/services/api.ts
T012  frontend/src/state/roomStore.ts
# Then T013 → T014 sequential (same file)

# Phase 7 — both together:
T018  backend tests
T019  frontend tests
```

---

## Implementation Strategy

### MVP First (US1 + US2 only — P1 stories)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T004)
3. Complete Phase 3: User Story 1 (T005–T007)
4. **STOP and VALIDATE**: Create room, see host in lobby
5. Complete Phase 4: User Story 2 (T008–T010)
6. **STOP and VALIDATE**: Join room, see both players in lobby

### Incremental Delivery

1. Phase 1 + 2 → foundation ready
2. Phase 3 → create room works (MVP slice 1)
3. Phase 4 → join room works (MVP slice 2, basic multiplayer)
4. Phase 5 → lobby auto-refreshes (quality of life)
5. Phase 6 → host starts game (complete feature)

---

## Notes

- [P] = different files, no incomplete dependencies
- [Story] maps each task to its user story for traceability
- T005 and T006 are in the same file — run sequentially
- T008 and T009 are sequential (service before route)
- T013 and T014 are sequential (both modify `LobbyPage.tsx`)
- Quickstart validation scenarios in `specs/001-room-setup-lobby/quickstart.md` serve as the manual acceptance test suite
