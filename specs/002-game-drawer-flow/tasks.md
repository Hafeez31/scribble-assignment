---
description: "Task list for Game Start & Drawer Flow"
---

# Tasks: Game Start & Drawer Flow

**Input**: Design documents from `specs/002-game-drawer-flow/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | contracts/api.md ✅ | research.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US2)
- Exact file paths included in all descriptions

## Path Conventions

- Backend source: `backend/src/`
- Frontend source: `frontend/src/`

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Type changes that both user stories depend on. All three can run in parallel since they touch different files.

**⚠️ CRITICAL**: Complete this phase before any user story work begins.

- [ ] T001 [P] Add `drawerId: string | null` and `secretWord: string | null` to `Room` interface, and add `drawerId: string | null`, `secretWord: string | null`, and `wordLength: number | null` to `RoomSnapshot` interface in `backend/src/models/game.ts`
- [ ] T002 [P] Mirror new `RoomSnapshot` fields in `frontend/src/services/api.ts` — add `drawerId: string | null`, `secretWord: string | null`, and `wordLength: number | null` to the `RoomSnapshot` interface
- [ ] T003 [P] Initialize new fields in `createRoom()` in `backend/src/services/roomStore.ts` — set `drawerId: null` and `secretWord: null` on the newly created `Room` object

**Checkpoint**: Types compile, existing tests still pass, new fields appear as `null` in all current API responses.

---

## Phase 2: User Story 1 — Drawer Assignment at Game Start (Priority: P1)

**Goal**: When the game starts, the host is automatically assigned as the active drawer and all players can see who is drawing.

**Independent Test**: Start a game with 2 players. Check `GET /rooms/:code?participantId=<any>` — `drawerId` must equal the host's `participantId`. Both players' game screens must display the drawer's name.

### Implementation for User Story 1

- [ ] T004 [US1] Update `startRoom(code: string)` return type in `backend/src/services/roomStore.ts` — change from `RoomSnapshot | null` to `Room | null`; inside the function set `room.drawerId = room.hostId` before saving; remove the `toRoomSnapshot()` call from inside `startRoom()`
- [ ] T005 [US1] Update `toRoomSnapshot(room: Room)` signature in `backend/src/services/roomStore.ts` to `toRoomSnapshot(room: Room, viewerParticipantId?: string)` — add `drawerId: room.drawerId` to the returned object; `secretWord` and `wordLength` can stay `null` for now (word logic added in US2)
- [ ] T006 [US1] Update `POST /:code/start` handler in `backend/src/api/rooms.ts` — after calling `startRoom(upperCode)` which now returns `Room | null`, call `toRoomSnapshot(room, participantId)` to build the response; pass `participantId` from the validated request body
- [ ] T007 [US1] Update `GET /:code` handler in `backend/src/api/rooms.ts` — pass `participantId` (already parsed from query via `roomViewerQuerySchema`) as the second argument to `toRoomSnapshot(room, participantId)`
- [ ] T008 [P] [US1] Update `frontend/src/pages/GamePage.tsx` — derive `isDrawer = room.drawerId === participantId`; add a "Now drawing" section visible to all players that displays the drawer's name (look up name from `room.participants` using `room.drawerId`); add "You are the drawer" label when `isDrawer` is true

**Checkpoint**: User Story 1 fully functional — `drawerId` set on game start, visible via API to all, and displayed in the game UI.

---

## Phase 3: User Story 2 — Secret Word Assignment and Selective Visibility (Priority: P1)

**Goal**: A random word is selected at game start. The drawer sees the full word; non-drawers see only the letter count. Secrecy is enforced server-side.

**Independent Test**: Start a game. `GET /rooms/:code?participantId=<drawerId>` must have `secretWord: "someword"` and `wordLength: null`. `GET /rooms/:code?participantId=<otherId>` must have `secretWord: null` and `wordLength: <n>`. Direct API call with no `participantId` must also have `secretWord: null`.

### Implementation for User Story 2

- [ ] T009 [US2] Update `startRoom(code: string)` in `backend/src/services/roomStore.ts` — after setting `drawerId`, pick a random word: `room.secretWord = STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)]`; import `STARTER_WORDS` from `../seed/starterData.js` (already imported via `listWords`, reuse the import)
- [ ] T010 [US2] Add empty-word-list guard to `POST /:code/start` handler in `backend/src/api/rooms.ts` — before calling `startRoom()`, check `STARTER_WORDS.length === 0` and throw `new HttpError(409, "No words available to start the game")`; import `STARTER_WORDS` from `../seed/starterData.js`
- [ ] T011 [US2] Complete word-secrecy logic in `toRoomSnapshot(room, viewerParticipantId?)` in `backend/src/services/roomStore.ts` — compute `isDrawer = viewerParticipantId !== undefined && viewerParticipantId === room.drawerId`; set `secretWord: isDrawer ? room.secretWord : null`; set `wordLength: !isDrawer && room.secretWord !== null ? room.secretWord.length : null`
- [ ] T012 [P] [US2] Update `frontend/src/pages/GamePage.tsx` — add drawer-specific word display: when `isDrawer && room.secretWord`, show the full word prominently (e.g. "Your word: rocket"); when `!isDrawer && room.wordLength`, show the letter-count hint (e.g. "_ _ _ _ _ _" or "6 letters"); add polling: copy the `useEffect` + `setInterval(poll, 2000)` + cleanup pattern from `frontend/src/pages/LobbyPage.tsx`, calling `roomStore.fetchRoom()` every 2000 ms

**Checkpoint**: US2 fully functional — word selected on start, drawer sees full word, non-drawers see only letter count, secrecy verified via direct API calls.

---

## Phase 4: Polish & Validation

**Purpose**: Verify the complete feature against existing tests and quickstart scenarios.

- [ ] T013 [P] Run backend tests: `cd backend && npm test` — confirm all existing tests pass with the model, service, and route changes
- [ ] T014 [P] Run frontend tests: `cd frontend && npm test` — confirm all existing tests pass with the updated `RoomSnapshot` type

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — T001, T002, T003 can all run in parallel (different files)
- **US1 (Phase 2)**: Depends on Phase 1 complete — T004 → T005 → T006 (sequential, same file); T007 [P] with T004+T005+T006; T008 [P] with backend tasks
- **US2 (Phase 3)**: Depends on US1 complete (T004+T005 must be done first) — T009 → T011 (same file, sequential); T010 [P] with T009; T012 [P] with backend tasks
- **Polish (Phase 4)**: Depends on all phases complete — T013 [P] T014 [P]

### Within Each Phase

- `roomStore.ts` tasks are sequential (T004 → T005 → T009 → T011 all touch the same file)
- `rooms.ts` tasks are sequential (T006 → T007 → T010)
- Frontend tasks (T002, T008, T012) are independent of each other and of backend tasks

### Parallel Opportunities

```bash
# Phase 1 — all three run together:
T001  backend/src/models/game.ts
T002  frontend/src/services/api.ts
T003  backend/src/services/roomStore.ts  (createRoom init only)

# Phase 2 — backend sequential, frontend parallel:
T004 → T005 → T006  backend/src/services/roomStore.ts + api/rooms.ts
T007                 backend/src/api/rooms.ts  (after T006)
T008                 frontend/src/pages/GamePage.tsx  (parallel with T004+)

# Phase 3 — backend sequential, frontend parallel:
T009 → T011          backend/src/services/roomStore.ts
T010                 backend/src/api/rooms.ts  (parallel with T009)
T012                 frontend/src/pages/GamePage.tsx  (parallel with T009+)

# Phase 4 — both together:
T013  backend tests
T014  frontend tests
```

---

## Implementation Strategy

### MVP First (US1 only — establish drawer identity)

1. Complete Phase 1: Foundational (T001–T003)
2. Complete Phase 2: User Story 1 (T004–T008)
3. **STOP and VALIDATE**: Start a game, confirm `drawerId` set, drawer name shown on all screens

### Incremental Delivery

1. Phase 1 → types ready, no regressions
2. Phase 2 → drawer assignment works (US1 MVP)
3. Phase 3 → word assignment + secrecy works (US2 complete)
4. Phase 4 → tests pass, full feature validated

---

## Notes

- T001, T002, T003 are all in different files → safe to run in parallel
- T004 and T005 are sequential: T005's `toRoomSnapshot` signature change depends on T004's `startRoom` return-type change being in place
- T006 depends on T004 (new `startRoom` return type) and T005 (updated `toRoomSnapshot`)
- T009 depends on T004 (must set `drawerId` before setting `secretWord` in same function)
- T011 depends on T005 (extends the `toRoomSnapshot` logic started there)
- T012 depends on T002 (needs updated `RoomSnapshot` type) and should come after T009+T011 are merged so polling returns real word data
- Quickstart validation scenarios in `specs/002-game-drawer-flow/quickstart.md` serve as the manual acceptance test suite
