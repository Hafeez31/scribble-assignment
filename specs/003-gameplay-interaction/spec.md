---
description: "Feature specification for Gameplay Interaction"
---

# Feature Specification: Gameplay Interaction

**Feature Branch**: `003-gameplay-interaction`

**Created**: 2026-06-08

**Status**: Draft

## User Scenarios & Testing

### User Story 1 — Drawer Draws on the Canvas (Priority: P1)

The drawer uses a mouse or touch input to draw freehand strokes on the canvas. Each completed stroke is saved and made visible to all players. The drawer can also clear the entire canvas at any time, which instantly removes all strokes from every player's screen.

**Why this priority**: Without a visible drawing, guessers have nothing to work with. The canvas is the core communication channel of the game.

**Independent Test**: Open two tabs. Host draws a stroke on Tab A — Tab B should display that stroke within ~2 seconds via polling. Host clears the canvas — Tab B should go blank within ~2 seconds.

**Acceptance Scenarios**:

1. **Given** the drawer is on the game screen, **When** they draw a freehand stroke, **Then** the stroke appears on the drawer's canvas immediately and on all guessers' canvases within the next poll cycle (~2 seconds).
2. **Given** one or more strokes exist, **When** the drawer clicks Clear, **Then** all strokes are removed from every player's canvas within the next poll cycle.
3. **Given** no strokes exist, **When** any player views the game screen, **Then** the canvas is blank.

---

### User Story 2 — Guesser Submits a Guess (Priority: P1)

A guesser types a word into the guess form and submits it. The submission is validated (empty or whitespace-only guesses are rejected with a clear inline message). All submitted guesses — including the guesser's name — appear in a shared guess history visible to every player. The history updates automatically via polling.

**Why this priority**: Guessing is the other half of the core game loop. Without it, the drawing has no purpose.

**Independent Test**: With two tabs open, Tab B submits a guess — within ~2 seconds, that guess appears in the history on Tab A as well. Submit a blank guess — it is rejected with a visible error message and is not added to the history.

**Acceptance Scenarios**:

1. **Given** a guesser is on the game screen, **When** they submit a non-empty guess, **Then** the guess (with the guesser's name) is added to the shared history visible to all players.
2. **Given** a guesser submits an empty or whitespace-only guess, **Then** the submission is rejected with an inline error message; the history is unchanged.
3. **Given** a guess has been submitted, **When** another player's client polls, **Then** that player's guess history updates to include the new entry.
4. **Given** the drawer is on the game screen, **Then** the guess form is not available to them (drawer cannot guess).

---

### User Story 3 — First Correct Guess Ends the Round and Awards Points (Priority: P2)

When a guesser's submission exactly matches the secret word (case-insensitive, trimmed), they are awarded 100 points and the round ends. All players are navigated to the game-end screen. Subsequent correct guesses after the first one do not score. The drawer always scores 0. Incorrect guesses also score 0.

**Why this priority**: Scoring and round-end give the game its conclusion. US1 and US2 deliver a playable loop; US3 adds the winning condition.

**Independent Test**: With two tabs, Tab B submits the correct word — Tab B scores 100, the round ends, and both tabs navigate to the game-end screen. Tab A (the drawer) has 0 points. Submitting the correct word a second time (if round has not ended) does not award another 100.

**Acceptance Scenarios**:

1. **Given** a guesser submits the correct word (case-insensitive, trimmed), **When** it is the first correct submission, **Then** that guesser is awarded 100 points and the round ends.
2. **Given** the round has ended, **When** all players' clients poll, **Then** every player is navigated to the game-end screen.
3. **Given** the round has ended via a correct guess, **When** the scores are inspected, **Then** the drawer has 0 points and the winning guesser has 100 points; all other players have 0 points.
4. **Given** the correct word has already been guessed, **When** another guesser also submits the correct word, **Then** they receive 0 points and the round is already ended.

---

### Edge Cases

- Submitting the correct word but with leading/trailing whitespace is treated as correct (guesses are trimmed before comparison).
- Comparison is case-insensitive: "ROCKET", "rocket", and "Rocket" all count as correct for the word "rocket".
- If the drawer somehow submits a guess (e.g. via direct API call), it is ignored or treated as a non-scoring submission — the drawer cannot win.
- A guesser who already submitted a correct guess cannot score again (round is ended after the first correct guess).
- Clearing the canvas when it is already blank has no visible effect and is a no-op server-side.

---

## Requirements

### Functional Requirements

**Drawing**

- **FR-001**: The drawer MUST be able to draw freehand strokes on the canvas using pointer input.
- **FR-002**: Each completed stroke MUST be persisted server-side as an ordered sequence of points.
- **FR-003**: All players MUST receive the current set of strokes via automatic polling and see the canvas update accordingly.
- **FR-004**: The drawer MUST be able to clear the canvas, wiping all stored strokes server-side.
- **FR-005**: When the canvas is cleared, all players' canvases MUST go blank within the next poll cycle.

**Guessing**

- **FR-006**: Guessers MUST be able to submit a guess through a text input form.
- **FR-007**: Guesses MUST be trimmed of leading/trailing whitespace before processing.
- **FR-008**: Empty or whitespace-only guesses MUST be rejected with a clear inline error message; they MUST NOT be stored or added to the history.
- **FR-009**: Accepted guesses MUST be stored with the guesser's name and added to a shared guess history.
- **FR-010**: The guess history MUST be synced to all players via polling; each entry shows the guesser's name and guess text only (no correct/incorrect indicator).
- **FR-011**: The drawer MUST NOT be able to submit guesses.

**Scoring & Round End**

- **FR-012**: Guess comparison MUST be case-insensitive.
- **FR-013**: The first guesser to submit the correct word MUST be awarded 100 points.
- **FR-014**: All subsequent correct guesses after the first MUST award 0 points.
- **FR-015**: Incorrect guesses MUST award 0 points.
- **FR-016**: The drawer MUST always end with 0 points.
- **FR-017**: When the first correct guess is received, the round MUST be marked as ended.
- **FR-018**: All players MUST be navigated to the game-end screen once the round-ended state is detected via polling.

### Key Entities

- **Stroke**: An ordered sequence of 2D points representing one freehand path drawn by the drawer. Belongs to a game round. Cleared as a group by the clear action.
- **Guess**: A single submission by a guesser. Has the guesser's participant ID, the raw trimmed text, and a timestamp. Stored even if incorrect, for display in the history.
- **Score**: A per-participant integer (0 or 100) for the round. Set to 100 for the first correct guesser; 0 for all others including the drawer.
- **Round State**: The active/ended status of the current round. Transitions from active → ended on the first correct guess.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A stroke drawn by the drawer appears on all guessers' screens within 3 seconds of being completed, with no manual action from any player.
- **SC-002**: 100% of empty or whitespace-only guess submissions are rejected before reaching the shared history.
- **SC-003**: The correct guesser's score updates to 100 and all players navigate to the game-end screen within 3 seconds of a correct guess being submitted.
- **SC-004**: 0% of non-drawer players see any correct/incorrect status indicator in the guess history.
- **SC-005**: The drawer's score is 0 in 100% of completed rounds, regardless of the outcome.

## Assumptions

- Feature 2 (Game Start & Drawer Flow) is complete: the game is in-progress, `drawerId` is set, and the secret word is stored server-side.
- The canvas is rendered in-browser; pointer events (mouse/touch) are captured client-side and sent to the server as complete strokes (not individual pixel events).
- Strokes are sent to the server one at a time when the pointer is released (mouseup / touchend), not streamed point-by-point.
- All players poll for the full canvas state (all strokes) on each tick; the server returns the complete stroke list, not a delta.
- Polling for canvas, guesses, and round state is unified under the existing room/game polling mechanism (~2 seconds).
- The game-end screen is out of scope for this feature; this feature only triggers the navigation to it.
- No time limit on the round; the round ends only when someone guesses correctly.
- The guess history is append-only within a round; there is no deletion of guess entries.
- Participant scores are stored as part of the game/room state in memory (no separate scoring service).
