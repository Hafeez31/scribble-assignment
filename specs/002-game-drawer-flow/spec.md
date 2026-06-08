---
description: "Feature specification for Game Start & Drawer Flow"
---

# Feature Specification: Game Start & Drawer Flow

**Feature Branch**: `002-game-drawer-flow`

**Created**: 2026-06-08

**Status**: Draft

## User Scenarios & Testing

### User Story 1 — Drawer Assignment at Game Start (Priority: P1)

When a hosted game starts, the host is automatically assigned as the active drawer for the round. All players in the game view can clearly see who the current drawer is.

**Why this priority**: Without a clearly identified drawer, no round can proceed. This is the foundational state every other game mechanic depends on.

**Independent Test**: Start a game with 2 players. Verify the host is shown as the active drawer on both players' screens, and the non-host player's screen correctly identifies who is drawing.

**Acceptance Scenarios**:

1. **Given** a room in the lobby with 2+ players, **When** the host starts the game, **Then** the host is immediately assigned as the active drawer and all players can see this on their game screen.
2. **Given** a game is in progress, **When** any player views the game screen, **Then** the active drawer's name is prominently displayed.
3. **Given** a game has started, **When** the drawer views their game screen, **Then** they can clearly see they are the active drawer.

---

### User Story 2 — Secret Word Assignment and Selective Visibility (Priority: P1)

When a game starts, a secret word is randomly selected from the available word list. The drawer sees the full word; all other players see only how many letters the word contains. The server never sends the word to non-drawers, regardless of how they access the game data.

**Why this priority**: Without proper word assignment and server-enforced secrecy, the core game mechanic is broken and trivially cheatable. Server-side enforcement is mandatory.

**Independent Test**: Start a game. Inspect the data the server returns to the drawer — it must contain the full word. Inspect the data returned to a non-drawer — it must contain only the letter count. Make a direct server request as a non-drawer and confirm the word is absent from the response.

**Acceptance Scenarios**:

1. **Given** a game has just started, **When** the drawer's game view loads, **Then** the full secret word is displayed to the drawer only.
2. **Given** a game has just started, **When** a non-drawer's game view loads, **Then** they see the word's letter count (e.g. "5 letters") but not the word itself.
3. **Given** a non-drawer requests game state directly from the server, **When** the server processes that request, **Then** the response never includes the secret word.
4. **Given** the starter word list, **When** a game starts, **Then** the word selected is drawn at random from that list.

---

### Edge Cases

- If the word list contains only one word, that word is always selected — no error occurs.
- The same word may be selected in different concurrent games; there is no cross-game deduplication.
- The drawer is always the host; there is no mechanism to assign a different drawer in this feature.
- If a player attempts to join after the game has started, the request is rejected (established in Feature 1).
- If the word list is empty, game start MUST be prevented with a clear server error.

---

## Requirements

### Functional Requirements

- **FR-001**: When a game starts, the system MUST assign the room host as the active drawer for the round.
- **FR-002**: The active drawer MUST be identifiable by all players in the game view without any manual action.
- **FR-003**: The system MUST randomly select one word from the available word list when a game starts.
- **FR-004**: The system MUST deliver the full secret word only to the active drawer.
- **FR-005**: The system MUST NOT include the secret word in any response delivered to non-drawer players.
- **FR-006**: Non-drawer players MUST receive the word's letter count so they know the length of the word to guess.
- **FR-007**: Word secrecy MUST be enforced at the server level, not only in the client interface.
- **FR-008**: The word MUST be selected from the existing starter word list present in the codebase.
- **FR-009**: If the word list is empty at game start time, the system MUST reject the start request with a clear error.

### Key Entities

- **Game Round**: The active state within an in-progress game. Has exactly one drawer (the host), one secret word, and a word-length hint for non-drawers.
- **Word Assignment**: The pairing of a randomly selected word to a round. Carries the full word for the drawer and a letter-count only for all others.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Within 1 second of game start, all players' screens reflect the correct game state — drawer identity and (for non-drawers) the word-length hint — with no manual refresh.
- **SC-002**: 100% of game starts result in a valid word being assigned from the starter word list.
- **SC-003**: 0% of server responses delivered to non-drawer participants contain the secret word, verifiable by direct API inspection.
- **SC-004**: All players correctly identify the active drawer on screen immediately after game start, without confusion.

## Assumptions

- Feature 1 (Room Setup & Lobby) is fully functional: host creates a room, players join, host starts the game, and room transitions to `"in-progress"`.
- The starter word list (`STARTER_WORDS`) is already populated in the codebase with at least one word.
- Game state (drawer assignment, word) persists in memory for the duration of the in-progress game only; no persistence beyond the session.
- This feature covers a single round only; round advancement, scoring, and game-end transitions are out of scope.
- The polling mechanism already in place for the lobby will be extended or reused for the game view to deliver per-player state updates.
- "Host" is the participant who created the room, identified by the `hostId` field established in Feature 1.
- The word-length hint shown to non-drawers is sufficient information; no partial letter reveals or other hints are in scope.
