# Reflection Report — Scribble

## Project Summary

Scribble is a browser-based multiplayer drawing-and-guessing game. The project was delivered in four sequential feature branches using the Speckit workflow (specify → plan → tasks → implement). This report covers what the starter scaffold provided, what was built, and how the pieces fit together.

---

## 1. What the Starter App Already Had

The scaffold was a **structurally complete but functionally hollow** full-stack application.

### Backend (`backend/`)

| File | What it contained |
|------|-------------------|
| `models/game.ts` | `Room` with only `code`, `status: "lobby"`, `participants`; no host, no word, no strokes |
| `services/roomStore.ts` | `createRoom`, `joinRoom`, `getRoom`, `startRoom` (no-op — changed nothing), `toRoomSnapshot` |
| `api/rooms.ts` | Four routes: `POST /rooms`, `POST /rooms/:code/join`, `POST /rooms/:code/start`, `GET /rooms/:code` |
| `api/schemas.ts` | Zod schemas for create, join, start, room-code params, viewer query |
| `seed/starterData.ts` | `STARTER_WORDS` array and `STARTER_ROLES` — present but unused |

`startRoom()` existed but did nothing meaningful — it returned the room without changing its status or assigning a drawer or word.

### Frontend (`frontend/`)

| File | What it contained |
|------|-------------------|
| `pages/StartPage.tsx` | Functional home page with Create / Join buttons |
| `pages/CreateRoomPage.tsx` | Working form — called the API and stored room state |
| `pages/JoinRoomPage.tsx` | Working form — called the API and stored room state |
| `pages/LobbyPage.tsx` | Scaffold — listed participants and had a Start button, but no polling and no functional guards |
| `pages/GamePage.tsx` | Placeholder — a `<div className="canvas-placeholder">` with hardcoded text |
| `components/GuessForm.tsx` | Placeholder — form that captured input but `handleSubmit` did nothing |
| `components/Scoreboard.tsx` | Empty placeholder |
| `components/ResultPanel.tsx` | Empty placeholder |
| `services/api.ts` | `createRoom`, `joinRoom`, `fetchRoom`, `startGame` — all wired to real endpoints |
| `state/roomStore.ts` | Full `useSyncExternalStore` pattern with `RoomStoreProvider`, `useRoomState`, `useRoomStore` |
| `styles/app.css` | Design system — tokens, layout classes, form/button/card styles |

The routing, state management pattern, API client structure, and visual design language were all in place. The gap was that nothing past the lobby actually worked.

---

## 2. What Was Added — Feature by Feature

### Feature 1 — Room Setup & Lobby (`001-room-setup-lobby`)

The goal was to make the lobby genuinely functional end-to-end.

**Backend changes:**
- Added `hostId` to `Room` and `RoomSnapshot` — tracked which participant created the room
- Made `startRoom()` actually change `status` to `"in-progress"`
- Added a 2-player minimum guard and a host-only guard on the start route (403 if not host)

**Frontend changes:**
- Rewrote `LobbyPage` with 2-second polling via `setInterval`, a live participant list, and conditional rendering of the Start button for the host only
- Added navigation guard: if no room in state, redirect to `/`; when `status === "in-progress"`, navigate to `/game`
- Added `Card`, `RoomCodeBadge`, and `PageHeader` shared components
- Added `fetchRoom()` to the room store so polling updates shared state

At this point: two players could open the app in separate tabs, create/join a room, and both land on `/game` when the host clicked Start.

---

### Feature 2 — Game Start & Drawer Flow (`002-game-drawer-flow`)

The goal was to assign roles and keep the secret word hidden from guessers.

**Backend changes:**
- Added `drawerId` (decoupled from `hostId` for future flexibility) and `secretWord` to `Room`
- `startRoom()` now assigns `drawerId = hostId`, picks a random word from `STARTER_WORDS`, clears strokes/guesses/scores (as stubs for Feature 3)
- Parameterised `toRoomSnapshot(room, viewerParticipantId?)`: drawer receives `secretWord`, non-drawers receive `null` + `wordLength` (letter count)

**Frontend changes:**
- `GamePage` derived `isDrawer = room.drawerId === participantId`
- Drawer sees their word in a "Your word to draw" card
- Guessers see underscores with a letter count hint
- `GuessForm` hidden from the drawer (`{!isDrawer && <GuessForm />}`)

At this point: role assignment and word secrecy worked correctly across tabs.

---

### Feature 3 — Gameplay Interaction (`003-gameplay-interaction`)

The core gameplay loop: drawing, guessing, scoring, and round-end.

**Backend changes:**
- Added `Point`, `Stroke`, `Guess` interfaces to `game.ts`
- Added `strokes: Stroke[]`, `guesses: Guess[]`, `scores: Record<string, number>` to `Room`
- Extended `RoomStatus` to include `"round-ended"`
- New service functions: `addStroke`, `clearStrokes`, `submitGuess` (with correct-guess detection and `status → "round-ended"` transition)
- New routes: `POST /rooms/:code/strokes`, `DELETE /rooms/:code/strokes`, `POST /rooms/:code/guesses` — each with drawer/guesser identity guards
- New Zod schemas: `addStrokeSchema`, `clearStrokesSchema`, `submitGuessSchema`

**Frontend changes:**
- `GamePage` completely rewritten:
  - HTML Canvas 2D API replaces the placeholder div — pointer events accumulate points and send a stroke on `mouseup`; canvas re-renders the full `room.strokes` array on every poll
  - Clear button (drawer only) wipes all strokes server-side
  - `GuessForm` wired to `api.submitGuess()` with inline error handling
  - Guess history rendered from `room.guesses`
  - Scoreboard rendered from `room.scores`
  - Polling navigates to `/results` when `status === "round-ended"`
- New api methods: `addStroke`, `clearStrokes`, `submitGuess`

At this point: the full round was playable — draw, guess, first correct guess triggers round-end, all tabs navigate to `/results`.

---

### Feature 4 — Results, Restart & Final Validation (`004-results-restart`)

The goal was to close the game loop with a results screen and a host-controlled restart.

**Backend changes:**
- New service function `restartRoom()` — resets `status`, `strokes`, `guesses`, `scores`, `drawerId`, `secretWord` while preserving `participants`, `hostId`, `code`
- New route `POST /rooms/:code/restart` — host-only (403 otherwise), 409 if not in `"round-ended"` state
- `toRoomSnapshot()` updated: when `status === "round-ended"`, `secretWord` is returned to **all** viewers (word reveal on results screen)
- New schema: `restartRoomSchema`

**Frontend changes:**
- New `ResultsPage.tsx`:
  - Mount guard: if no room or `status !== "round-ended"`, redirect to `/`
  - Displays the revealed secret word, final scores, and full guess history
  - Polling: if `status` returns to `"lobby"`, navigate to `/lobby` (non-host auto-return)
  - Host sees a "Play Again" button; non-hosts see a waiting message
- `/results` route added to the router
- New api method: `restartRoom`

At this point: the complete round cycle works — Lobby → Game → Results → Lobby (repeat).

---

## 3. What Was Not Built (Deliberately Out of Scope)

- **Multiple rounds / round rotation** — drawer is always the host; no drawer rotation between rounds
- **Timers** — no countdown per round
- **Real-time drawing** (WebSockets/SSE) — strokes sync via 2-second polling only, as required by the constitution
- **Persistence** — all state lives in memory; server restart clears all rooms
- **Authentication** — identity is a UUID held in browser state only
- **Mobile / touch drawing** — pointer events cover mouse only

---

## 4. Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| `toRoomSnapshot(room, viewerParticipantId?)` for word secrecy | One function, server-enforced — no client can cheat by reading the raw room |
| `drawerId` separate from `hostId` | Keeps the model extensible for future drawer rotation without a breaking change |
| Full stroke array re-render on every poll | Simplest correct approach — no delta tracking, no out-of-order issues |
| `status === "round-ended"` as navigation trigger | Consistent with how `"in-progress"` triggers lobby→game; one polling pattern across all pages |
| Denormalised `playerName` in `Guess` | Avoids cross-referencing `participants` at render time; names are stable within a round |
| `structuredClone` for all store returns | Prevents accidental mutation of shared in-memory state from route handlers |

---

## 5. What the Speckit Workflow Provided

Each feature followed the same five-step cycle: **specify → plan → tasks → implement → commit**.

- The **spec** captured what users needed without prescribing implementation
- The **plan** resolved all technical decisions upfront (research.md), defined the data model changes, and produced an API contract before any code was written
- The **task list** broke work into independently executable steps with explicit file paths and dependency ordering
- The **implementation** proceeded task-by-task with TypeScript compilation and test runs as validation gates at the end of each feature

This meant that every feature was reasoned about fully before a single line of code changed, and the diff for each feature was predictable and reviewable.
