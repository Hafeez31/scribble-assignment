---
description: "Task list for Gameplay Interaction"
---

# Tasks: Gameplay Interaction

**Input**: Design documents from `specs/003-gameplay-interaction/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | contracts/api.md ✅ | research.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US3)
- Exact file paths included in all descriptions

## Path Conventions

- Backend source: `backend/src/`
- Frontend source: `frontend/src/`

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Type and schema changes shared by all three user stories. All tasks can run in parallel (different files).

- [x] T001 [P] Add `Point`, `Stroke`, `Guess` interfaces; expand `RoomStatus` to `"lobby" | "in-progress" | "round-ended"`; add `strokes: Stroke[]`, `guesses: Guess[]`, `scores: Record<string, number>` to both `Room` and `RoomSnapshot` interfaces in `backend/src/models/game.ts`
- [x] T002 [P] Add `addStrokeSchema`, `clearStrokesSchema`, and `submitGuessSchema` to `backend/src/api/schemas.ts` — `addStrokeSchema = z.object({ participantId: z.string(), points: z.array(z.object({ x: z.number(), y: z.number() })).min(1) })`; `clearStrokesSchema = z.object({ participantId: z.string() })`; `submitGuessSchema = z.object({ participantId: z.string(), text: z.string().trim().min(1).max(100) })`
- [x] T003 [P] Mirror new types and fields in `frontend/src/services/api.ts` — add `Point`, `Stroke`, `Guess` interfaces; add `strokes: Stroke[]`, `guesses: Guess[]`, `scores: Record<string, number>` to `RoomSnapshot`; expand `status` type to include `"round-ended"`

**Checkpoint**: Types compile with no errors. `backend/src/models/game.ts` and `frontend/src/services/api.ts` now include all new fields.

---

## Phase 2: User Story 1 — Drawer Draws on the Canvas (Priority: P1)

**Goal**: The drawer draws freehand strokes on the canvas. Strokes are stored server-side and synced to all players via polling. The drawer can clear the canvas, blanking all screens.

**Independent Test**: Draw a stroke on the drawer's tab — verify it appears on a second tab within ~2 seconds. Click Clear — verify both tabs go blank within ~2 seconds. Attempt to add a stroke as a non-drawer — expect 403.

### Implementation for User Story 1

- [x] T004 [US1] Update `startRoom()` in `backend/src/services/roomStore.ts` — add `strokes: []` to the room object initialisation (alongside existing `drawerId` and `secretWord` assignment)
- [x] T005 [US1] Add `addStroke(code: string, points: Point[])` function to `backend/src/services/roomStore.ts` — get room from Map, push `{ points }` to `room.strokes`, update `room.updatedAt`, save back to Map, return cloned room
- [x] T006 [US1] Add `clearStrokes(code: string)` function to `backend/src/services/roomStore.ts` — get room from Map, set `room.strokes = []`, update `room.updatedAt`, save, return cloned room
- [x] T007 [US1] Update `toRoomSnapshot()` in `backend/src/services/roomStore.ts` — add `strokes: room.strokes.map(s => ({ points: [...s.points] }))` to the returned object
- [x] T008 [US1] Add `POST /:code/strokes` route handler to `backend/src/api/rooms.ts` — parse `addStrokeSchema`, get room, throw 404 if missing, 409 if status !== "in-progress", 403 if `participantId !== room.drawerId`; call `addStroke(upperCode, points)`; respond `{ ok: true }`
- [x] T009 [US1] Add `DELETE /:code/strokes` route handler to `backend/src/api/rooms.ts` — parse `clearStrokesSchema` from `request.body`, get room, throw 404/409/403 guards; call `clearStrokes(upperCode)`; respond `{ ok: true }`
- [x] T010 [P] [US1] Add `addStroke(code, participantId, points)` and `clearStrokes(code, participantId)` methods to `frontend/src/services/api.ts` — `addStroke` POSTs to `/rooms/:code/strokes`; `clearStrokes` sends DELETE to `/rooms/:code/strokes` with body `{ participantId }`; both return `{ ok: boolean }`
- [x] T011 [P] [US1] Replace the `.canvas-placeholder` div in `frontend/src/pages/GamePage.tsx` with a `<canvas>` element using a `useRef`; add a `useEffect` that re-renders the full `room.strokes` array onto the canvas whenever `room.strokes` changes (clear canvas, then draw each stroke as a path); add pointer event handlers (`onMouseDown`, `onMouseMove`, `onMouseUp`) on the canvas for the drawer only — accumulate points during drag, call `api.addStroke()` on mouseup; add a "Clear" button (drawer only) that calls `api.clearStrokes()`

**Checkpoint**: US1 fully functional — drawer draws and clears; non-drawer sees updates via polling within ~2 seconds.

---

## Phase 3: User Story 2 — Guesser Submits a Guess (Priority: P1)

**Goal**: Guessers submit trimmed guesses via the form. Empty guesses are rejected. Submitted guesses (player name + text) are stored and synced to all players via polling.

**Independent Test**: Submit "banana" on the guesser's tab — it appears in the history on both tabs within ~2 seconds. Submit an empty guess — it is rejected with an inline error and not added to history. Attempt to submit a guess as the drawer — expect 403.

### Implementation for User Story 2

- [x] T012 [US2] Update `startRoom()` in `backend/src/services/roomStore.ts` — add `guesses: []` to room initialisation
- [x] T013 [US2] Add `submitGuess(code: string, participantId: string, text: string)` to `backend/src/services/roomStore.ts` — get room from Map; resolve `playerName` from `room.participants.find(p => p.id === participantId)?.name`; push `{ participantId, playerName, text }` to `room.guesses`; update `updatedAt`; save; return `{ correct: false }` for now (scoring logic added in US3)
- [x] T014 [US2] Update `toRoomSnapshot()` in `backend/src/services/roomStore.ts` — add `guesses: room.guesses.map(g => ({ ...g }))` to the returned object
- [x] T015 [US2] Add `POST /:code/guesses` route handler to `backend/src/api/rooms.ts` — parse `submitGuessSchema`; get room; throw 404 if missing; 409 if status !== "in-progress"; 403 with message "Drawer cannot submit guesses" if `participantId === room.drawerId`; call `submitGuess(upperCode, participantId, text)`; respond `{ correct: result.correct }`
- [x] T016 [P] [US2] Add `submitGuess(code, participantId, text)` method to `frontend/src/services/api.ts` — POSTs to `/rooms/:code/guesses` with body `{ participantId, text }`; returns `{ correct: boolean }`
- [x] T017 [P] [US2] Wire up `GuessForm` in `frontend/src/pages/GamePage.tsx` — pass an `onSubmit` handler that calls `api.submitGuess()`; add local state for `guessError`; show inline error "Guess cannot be empty" if trimmed text is empty (client-side guard before API call); clear the form input on successful submission; render the guess history below the form as a list showing `{guess.playerName}: {guess.text}` for each entry in `room.guesses`

**Checkpoint**: US2 fully functional — guesses appear in history on all screens; empty guesses rejected; drawer blocked server-side.

---

## Phase 4: User Story 3 — First Correct Guess Ends the Round (Priority: P2)

**Goal**: The first guesser to submit the correct word (case-insensitive, trimmed) scores 100. The round status transitions to "round-ended". All players navigate to `/results`.

**Independent Test**: Submit the correct word — response has `correct: true`; within ~2 seconds both tabs navigate to `/results`. Submit the same word again — `correct: false`; no score change. Drawer always has 0 points.

### Implementation for User Story 3

- [x] T018 [US3] Update `startRoom()` in `backend/src/services/roomStore.ts` — add `scores: Object.fromEntries(room.participants.map(p => [p.id, 0]))` to room initialisation
- [x] T019 [US3] Update `submitGuess()` in `backend/src/services/roomStore.ts` — after pushing the guess, check if `room.status === "in-progress"` AND `text.toLowerCase() === room.secretWord?.toLowerCase()`; if true: set `room.scores[participantId] = 100` and `room.status = "round-ended"`; return `{ correct: true }`; otherwise return `{ correct: false }`
- [x] T020 [US3] Update `toRoomSnapshot()` in `backend/src/services/roomStore.ts` — add `scores: { ...room.scores }` to the returned object
- [x] T021 [P] [US3] Update `frontend/src/services/api.ts` — add `scores: Record<string, number>` to `RoomSnapshot` (if not already present from T003) — confirm the field is included
- [x] T022 [P] [US3] Update `frontend/src/pages/GamePage.tsx` — extend the existing polling `useEffect`: when `room.status === "round-ended"`, set `navigatingRef.current = true` and call `navigate("/results", { replace: true })`; render `room.scores` in the Scoreboard area showing each participant's name and score

**Checkpoint**: Full feature complete — correct guess ends round, scores updated, all players navigate to `/results` within ~2 seconds.

---

## Phase 5: Polish & Validation

**Purpose**: Verify the complete feature against existing tests and quickstart scenarios.

- [x] T023 [P] Run backend tests: `cd backend && npm test` — confirm all existing tests pass with model, schema, service, and route changes
- [x] T024 [P] Run frontend tests: `cd frontend && npm test` — confirm all existing tests pass with updated `RoomSnapshot` type

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — T001, T002, T003 all run in parallel
- **US1 (Phase 2)**: Depends on Phase 1 — T004 → T005 → T006 → T007 (sequential, same file); T008 → T009 (same file); T010 [P], T011 [P] run alongside backend
- **US2 (Phase 3)**: Depends on Phase 1 + T007 done — T012 → T013 → T014 (same file); T015 (route, after T013); T016 [P], T017 [P] alongside backend
- **US3 (Phase 4)**: Depends on T013+T014 done — T018 → T019 → T020 (same file); T021 [P], T022 [P] alongside backend
- **Polish (Phase 5)**: Depends on all phases — T023 [P] T024 [P]

### Within Each Phase

- All `roomStore.ts` tasks are sequential (T004→T005→T006→T007→T012→T013→T014→T018→T019→T020)
- All `rooms.ts` tasks are sequential within their story (T008→T009, then T015)
- Frontend tasks (T010, T011, T016, T017, T021, T022) are parallel with backend tasks in their story

### Parallel Opportunities

```bash
# Phase 1 — all three in parallel:
T001  backend/src/models/game.ts
T002  backend/src/api/schemas.ts
T003  frontend/src/services/api.ts

# Phase 2 — backend sequential, frontend parallel:
T004 → T005 → T006 → T007   backend/src/services/roomStore.ts
T008 → T009                  backend/src/api/rooms.ts
T010                         frontend/src/services/api.ts
T011                         frontend/src/pages/GamePage.tsx

# Phase 3 — backend sequential, frontend parallel:
T012 → T013 → T014           backend/src/services/roomStore.ts
T015                         backend/src/api/rooms.ts
T016                         frontend/src/services/api.ts
T017                         frontend/src/pages/GamePage.tsx

# Phase 4 — backend sequential, frontend parallel:
T018 → T019 → T020           backend/src/services/roomStore.ts
T021                         frontend/src/services/api.ts
T022                         frontend/src/pages/GamePage.tsx

# Phase 5 — both together:
T023  backend tests
T024  frontend tests
```

---

## Implementation Strategy

### MVP First (US1 + US2 — drawing and guessing before scoring)

1. Complete Phase 1: Foundational (T001–T003)
2. Complete Phase 2: US1 Drawing (T004–T011)
3. **STOP and VALIDATE**: Draw strokes, verify polling sync, verify clear
4. Complete Phase 3: US2 Guessing (T012–T017)
5. **STOP and VALIDATE**: Submit guesses, verify history sync, verify empty rejection

### Incremental Delivery

1. Phase 1 → types compile, no regressions
2. Phase 2 → canvas drawing + clear works (US1 MVP)
3. Phase 3 → guess submission + history works (US2 complete)
4. Phase 4 → scoring + round-end navigation works (US3 complete)
5. Phase 5 → tests pass, full feature validated

---

## Notes

- T004, T012, T018 all modify `startRoom()` in `roomStore.ts` sequentially — done in phases to match story order
- T005/T006/T007 are sequential (same file); do not attempt to parallelize
- T011 is the most complex frontend task — HTML Canvas API, pointer events, stroke rendering, and clear; tackle after T010 (api methods) is done
- T017 depends on `GuessForm` already existing (it does — it's a placeholder component in `frontend/src/components/`)
- `navigatingRef` pattern (from LobbyPage) should be reused in GamePage for round-end navigation to prevent double-navigate
- Quickstart validation scenarios in `specs/003-gameplay-interaction/quickstart.md` serve as the manual acceptance test suite
