---
description: "Design decisions for Gameplay Interaction"
---

# Research: Gameplay Interaction

## Decision 1: Round-Ended State via `RoomStatus` Expansion (Not a Separate Boolean)

**Decision**: Expand `RoomStatus` to `"lobby" | "in-progress" | "round-ended"`. Setting `room.status = "round-ended"` on the first correct guess replaces a separate `roundEnded: boolean` field.

**Rationale**: Follows the existing pattern — `"in-progress"` already drives lobby→game navigation; `"round-ended"` drives game→results navigation using the same polling check in GamePage. One field of truth for navigation state, no extra flags. The state machine stays linear: lobby → in-progress → round-ended.

**Alternatives considered**:
- `roundEnded: boolean` field alongside `status: "in-progress"` — rejected: two fields where one suffices; inconsistent with how lobby→game transition is handled.
- New `RoomStatus` value `"completed"` — rejected: semantically overloaded (game-end is a separate feature); "round-ended" scopes precisely to this feature.

---

## Decision 2: Strokes Stored as `Stroke[]` on `Room` (Full Array Per Poll)

**Decision**: Add `strokes: Stroke[]` to `Room` where `Stroke = { points: Point[] }` and `Point = { x: number; y: number }`. Each poll returns the complete stroke array. Clear sets `strokes = []`.

**Rationale**: Simplest model that satisfies the spec. Full-array polling is correct for this scale (small number of strokes per round). Delta/diff sync would add significant complexity with no benefit for a casual single-room game. Clearing is a `strokes = []` operation — O(1), no index tracking needed.

**Alternatives considered**:
- Delta events (only send new strokes since last poll) — rejected: requires client-side event counters or timestamps; complicates the polling contract; full array is simpler at this scale.
- Stroke IDs for selective clearing — rejected: only full-clear is required; IDs add no value.

---

## Decision 3: Strokes Sent as Complete Paths (Not Point-by-Point)

**Decision**: The client sends a complete stroke (full array of points) in one `POST /rooms/:code/strokes` request when the pointer is released (mouseup / touchend). No streaming of individual points.

**Rationale**: Matches the spec assumption. One request per stroke keeps the API simple. The ~2 s polling lag is acceptable for a casual drawing game — real-time stroke streaming would require WebSockets (forbidden by constitution).

**Alternatives considered**:
- Stream points via rapid polling — rejected: produces excessive API calls; unnatural drawing feel; no architectural benefit over sending on release.

---

## Decision 4: Three New Endpoints on the Rooms Router

**Decision**: Add `POST /rooms/:code/strokes`, `DELETE /rooms/:code/strokes`, and `POST /rooms/:code/guesses` to the existing rooms router (`backend/src/api/rooms.ts`).

**Rationale**: Keeps all room-related actions co-located. No new router file needed. Follows the existing pattern where room actions (`/join`, `/start`) live in the same router.

**Alternatives considered**:
- Separate `/game` router — rejected: the game state is still room state; splitting would create artificial routing complexity with no payoff at this scale.

---

## Decision 5: Guess History Uses Denormalised `playerName` (Not a Lookup)

**Decision**: `Guess` stores `{ participantId, playerName, text }`. The `playerName` is resolved at guess-submission time by looking up the participant in `room.participants`, then stored on the guess directly.

**Rationale**: Makes the snapshot self-contained — the frontend renders the history without needing to cross-reference `room.participants`. Avoids an extra join at display time. Names don't change within a session, so denormalisation has no consistency risk.

**Alternatives considered**:
- Store only `participantId`, resolve name at render time — rejected: forces frontend to look up names on every render; messier client code.

---

## Decision 6: Score as `Record<string, number>` on `Room` (Initialised at Game Start)

**Decision**: Add `scores: Record<string, number>` to `Room`. Initialise all participant scores to `0` in `startRoom()`. On first correct guess: `scores[participantId] = 100`.

**Rationale**: Simple, O(1) lookup. Initialising at game start (with all participant IDs) means the snapshot always returns a complete score map — no missing-key edge cases on the frontend. The drawer is pre-initialised to 0 and never updated.

**Alternatives considered**:
- Score on `Participant` object — rejected: mixes game-round data into the identity model; `Participant` is a lobby concept.
- Score array with `{ participantId, score }` — rejected: more verbose, no benefit over a Record for this use case.

---

## Decision 7: Drawer-Only Guards in Route Handlers (Not Service Layer)

**Decision**: The route handlers for `POST /strokes` and `DELETE /strokes` check `participantId === room.drawerId` and throw `HttpError(403)` if not. The service functions (`addStroke`, `clearStrokes`) are pure and don't re-check.

**Rationale**: Consistent with the pattern established in Feature 1 (`POST /start` checks host identity in the route handler, not the service). Business-rule guards belong in the route layer; services stay pure.

---

## Decision 8: `submitGuess` Rejects Drawer Submissions via Route Handler

**Decision**: `POST /rooms/:code/guesses` checks `participantId === room.drawerId` and throws `HttpError(403, "Drawer cannot submit guesses")` before calling any service function.

**Rationale**: Server-side enforcement of FR-011. The frontend already hides the GuessForm from the drawer (Feature 2), but the backend must not rely on client-side UI state.

---

## Decision 9: Canvas Rendering via HTML Canvas API (Drawer Interaction Client-Only)

**Decision**: The drawer's canvas uses the HTML Canvas 2D API. Mouse/touch event listeners capture points during pointer-down→move→up sequences. On pointer-up, the accumulated points are sent as a single stroke to the server. The canvas is re-rendered from the full `strokes` array on every poll update.

**Rationale**: Standard browser drawing approach. No third-party canvas library needed. Re-rendering from the full array on each poll ensures consistency — no divergence between local and server state. The Scoreboard and ResultPanel components already exist as placeholders in GamePage.

**Alternatives considered**:
- Progressive rendering (only draw new strokes) — rejected: requires client to track which strokes have been rendered; full re-render from scratch is simpler and fast enough for a small stroke count.
