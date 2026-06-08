---
description: "Task list for Results, Restart & Final Validation"
---

# Tasks: Results, Restart & Final Validation

**Input**: Design documents from `specs/004-results-restart/`

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

**Purpose**: Schema, service, and snapshot changes shared by both user stories. All three tasks touch different files and can run in parallel.

- [x] T001 [P] Add `restartRoomSchema = z.object({ participantId: z.string() })` to `backend/src/api/schemas.ts` — export it alongside the existing schemas
- [x] T002 [P] Update `toRoomSnapshot()` in `backend/src/services/roomStore.ts` — change the `secretWord` / `wordLength` logic so that when `room.status === "round-ended"`, `secretWord` is returned as the full word for ALL viewers (not just the drawer) and `wordLength` is `null` for all; the existing drawer-only rule continues to apply only when `status === "in-progress"`
- [x] T003 [P] Add `restartRoom(code: string): Room | null` to `backend/src/services/roomStore.ts` — get room from Map; if not found return null; set `room.status = "lobby"`, `room.strokes = []`, `room.guesses = []`, `room.scores = {}`, `room.drawerId = null`, `room.secretWord = null`, `room.updatedAt = now()`; save back to Map; return `structuredClone(room)`

**Checkpoint**: `backend/src/api/schemas.ts`, `backend/src/services/roomStore.ts` compile with no errors. `toRoomSnapshot()` exposes the secret word when status is `"round-ended"`.

---

## Phase 2: User Story 1 — View Round Results (Priority: P1)

**Goal**: All players can view the results screen showing the revealed secret word, final scores, and full guess history. Invalid direct navigation redirects to `/`.

**Independent Test**: After a round ends (both tabs at `/results`), verify both tabs show the secret word, correct scores (winner 100, others 0), and full guess list. Open `/results` directly with no session — verify redirect to `/`.

### Implementation for User Story 1

- [x] T004 [P] [US1] Create `frontend/src/pages/ResultsPage.tsx` — (1) read `room` and `participantId` from `useRoomState()`; (2) on mount `useEffect`: if `!room || room.status !== "round-ended"`, call `navigate("/", { replace: true })` and return; (3) render a "Round Over" heading; (4) render a `<Card title="The Word Was">` showing `room.secretWord`; (5) render a `<Card title="Final Scores">` with a `<ul>` listing each participant's name and `room.scores[p.id] ?? 0` pts; (6) render a `<Card title="Guess History">` listing `room.guesses` as `{g.playerName}: {g.text}` — no polling or restart button yet (added in US2)
- [x] T005 [P] [US1] Register the `/results` route in `frontend/src/App.tsx` — import `ResultsPage` and add `<Route path="/results" element={<ResultsPage />} />` alongside the existing routes

**Checkpoint**: US1 fully functional — results screen shows word, scores, and history for all players; direct navigation to `/results` without a round-ended session redirects to `/`.

---

## Phase 3: User Story 2 — Host Restarts the Game (Priority: P2)

**Goal**: The host can restart the round from the results screen, resetting the room to lobby state and preserving all players. Non-host players auto-navigate to `/lobby` via polling.

**Independent Test**: Host clicks Restart — host tab navigates to `/lobby` immediately. Non-host tab navigates to `/lobby` within ~2 seconds. Both tabs show the same participants. Re-POST restart — expect 409.

### Implementation for User Story 2

- [x] T006 [US2] Add `POST /:code/restart` route handler to `backend/src/api/rooms.ts` — parse `restartRoomSchema` from `request.body`; get room with `getRoom(upperCode)`; throw `HttpError(404, "Room not found")` if missing; throw `HttpError(409, "Room is not in round-ended state")` if `room.status !== "round-ended"`; throw `HttpError(403, "Only the host can restart")` if `room.hostId !== participantId`; call `restartRoom(upperCode)`; respond `200` with `{ room: toRoomSnapshot(restartedRoom) }`; import `restartRoom` and `restartRoomSchema` at top of file
- [x] T007 [P] [US2] Add `restartRoom(code: string, participantId: string): Promise<{ room: RoomSnapshot }>` method to `frontend/src/services/api.ts` — POSTs to `/rooms/${code}/restart` with body `{ participantId }`; returns the parsed JSON response
- [x] T008 [US2] Extend `frontend/src/pages/ResultsPage.tsx` with restart and polling: (1) add `navigatingRef = useRef(false)` and `roomStore = useRoomStore()`; (2) add polling `useEffect` (depends on `room`) — `setInterval` at 2000ms; on each tick if `navigatingRef.current` skip; call `roomStore.fetchRoom()`; if updated `status === "lobby"`, set `navigatingRef.current = true` and `navigate("/lobby", { replace: true })`; on 404/not-found error set `navigatingRef.current = true` and `navigate("/", { replace: true })`; (3) derive `isHost = room.hostId === participantId`; (4) render a host-only "Restart" button (below scores): `onClick` calls `api.restartRoom(room.code, participantId)` then sets `navigatingRef.current = true` and `navigate("/lobby", { replace: true })`; wrap in `try/catch` — on error show inline error message; (5) non-host players see no restart button (read-only view)

**Checkpoint**: Full feature complete — results screen displays all data; host restarts → both tabs navigate to `/lobby` with participants preserved; non-host has no restart button.

---

## Phase 4: Polish & Validation

**Purpose**: Verify the complete feature against existing tests and TypeScript compilation.

- [x] T009 [P] Run backend tests: `cd backend && npm test` — confirm all existing tests pass with updated `toRoomSnapshot()`, new `restartRoom()` service, and new route
- [x] T010 [P] Run frontend tests: `cd frontend && npm test` — confirm all existing tests pass with new `ResultsPage` and updated `api.ts`
- [x] T011 [P] Run TypeScript checks: `cd backend && npx tsc --noEmit` and `cd frontend && npx tsc --noEmit` — confirm both projects compile with zero errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — T001, T002, T003 all run in parallel (different files)
- **US1 (Phase 2)**: Depends on T002 (toRoomSnapshot word-reveal) — T004 and T005 run in parallel
- **US2 (Phase 3)**: Depends on T001 (schema) and T003 (restartRoom service) — T006 sequential; T007 parallel with T006; T008 sequential after T006+T007
- **Polish (Phase 4)**: Depends on all phases — T009, T010, T011 run in parallel

### Within Each Phase

- Foundational tasks T001, T002, T003: fully parallel (different files)
- US1 tasks T004, T005: parallel (different files)
- US2 tasks: T006 → T007 (parallel with T006) → T008 (after both done)
- Polish tasks T009, T010, T011: fully parallel

### Parallel Opportunities

```bash
# Phase 1 — all three in parallel:
T001  backend/src/api/schemas.ts
T002  backend/src/services/roomStore.ts  (toRoomSnapshot)
T003  backend/src/services/roomStore.ts  (restartRoom — same file as T002, sequential after T002)

# Phase 2 — parallel:
T004  frontend/src/pages/ResultsPage.tsx
T005  frontend/src/App.tsx

# Phase 3:
T006  backend/src/api/rooms.ts
T007  frontend/src/services/api.ts      (parallel with T006)
T008  frontend/src/pages/ResultsPage.tsx (after T006+T007)

# Phase 4 — all together:
T009  backend tests
T010  frontend tests
T011  tsc --noEmit (both)
```

> **Note**: T002 and T003 both modify `roomStore.ts`. Execute T002 first (update `toRoomSnapshot`), then T003 (add `restartRoom`) in the same editing pass.

---

## Implementation Strategy

### MVP First (US1 — Results Display)

1. Complete Phase 1: Foundational (T001–T003)
2. Complete Phase 2: US1 Display (T004–T005)
3. **STOP and VALIDATE**: Navigate to `/results` after a round — verify word, scores, history visible on all tabs; test direct navigation redirect

### Incremental Delivery

1. Phase 1 → types/service compile, toRoomSnapshot updated
2. Phase 2 → results screen fully readable (US1 MVP)
3. Phase 3 → restart closes the loop (US2 complete)
4. Phase 4 → tests pass, TypeScript clean

---

## Notes

- T002 and T003 are in the same file (`roomStore.ts`) — implement in order within a single editing session; do not attempt to run them truly in parallel
- T008 is the most complex frontend task — extends `ResultsPage` with polling, navigatingRef, and the conditional restart button; tackle after T006 and T007 are done
- The `navigatingRef` guard pattern is already established in `LobbyPage` and `GamePage` — replicate it exactly
- `room.secretWord` will be non-null on the results screen because `toRoomSnapshot()` returns it for all viewers when `status === "round-ended"`
- Quickstart validation scenarios in `specs/004-results-restart/quickstart.md` serve as the manual acceptance test suite
