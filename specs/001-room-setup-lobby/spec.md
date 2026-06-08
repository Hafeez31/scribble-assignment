# Feature Specification: Room Setup & Lobby

**Feature Branch**: `001-room-setup-lobby`

**Created**: 2026-06-08

**Status**: Draft

---

## User Scenarios & Testing

### User Story 1 — Host Creates a Room (Priority: P1)

A player opens the app and creates a new game room. They provide their name,
and the system creates a room with a unique code. That player automatically
becomes the host. They are taken to the lobby where they can see the room code
to share with others.

**Why this priority**: All other scenarios depend on a room existing. This is
the entry point for every game session.

**Independent Test**: A single player can create a room, land in the lobby,
and see their name listed as the host — no other players needed.

**Acceptance Scenarios**:

1. **Given** a player provides a valid name (1–30 characters), **When** they
   submit the create-room form, **Then** a room is created, the player is
   marked as host, and they are shown the lobby with the unique room code.

2. **Given** a player submits the create-room form with an empty name,
   **When** the form is validated, **Then** the submission is blocked and a
   clear error message is shown before any network call is made.

3. **Given** a player submits the create-room form with a name exceeding
   30 characters, **When** the form is validated, **Then** the submission is
   blocked and a clear error message is shown.

---

### User Story 2 — Guest Joins a Room (Priority: P1)

A player receives a room code from the host and enters it alongside their
name to join the existing lobby.

**Why this priority**: Without joining, no multiplayer session can occur.
P1 alongside host creation because both are required for a minimum viable
game session.

**Independent Test**: A second player can join an existing room using its
code and appear in the lobby participant list alongside the host.

**Acceptance Scenarios**:

1. **Given** a valid room code and a valid name (1–30 characters), **When**
   the player submits the join-room form, **Then** they are added to the room
   and taken to the lobby showing all current participants.

2. **Given** a player submits the join-room form with an empty room code,
   **When** the form is validated, **Then** the submission is blocked and a
   clear error is shown indicating the code is required.

3. **Given** a player submits the join-room form with a room code that does
   not match any active room, **When** the request is processed, **Then** a
   clear error message is displayed (e.g., "Room not found").

4. **Given** a player attempts to join a room whose game has already started,
   **When** the request is processed, **Then** it is rejected with a clear
   error message (e.g., "Game already in progress").

5. **Given** a player submits a join-room form with an empty name, **When**
   the form is validated, **Then** the submission is blocked with a clear
   error message.

---

### User Story 3 — Lobby Auto-Updates for All Participants (Priority: P2)

Once in the lobby, all participants (host and guests) see the live participant
list update automatically without manually refreshing, as new players join.

**Why this priority**: Provides the real-time feel of the lobby; depends on
P1 stories being complete. Non-blocking for basic room functionality.

**Independent Test**: With two browser tabs open in the same room lobby,
joining on one tab causes the participant to appear on the other tab within
~2 seconds, without any manual refresh action.

**Acceptance Scenarios**:

1. **Given** a player is in the lobby, **When** another player joins the room,
   **Then** the new participant appears in the lobby list within approximately
   2 seconds.

2. **Given** a player is in the lobby, **When** the host starts the game,
   **Then** that player is automatically navigated to the game page within
   approximately 2 seconds.

3. **Given** the polling detects the room is closed (host left), **When**
   the response indicates the room no longer exists, **Then** participants
   are redirected to the start page with a clear message.

---

### User Story 4 — Host Starts the Game (Priority: P2)

The host can start the game from the lobby once at least 2 players are
present. Non-host participants cannot trigger the game start.

**Why this priority**: Depends on both P1 stories and the lobby being
functional. Gating mechanism for the game phase.

**Independent Test**: With 2 players in the lobby, only the host sees an
enabled "Start Game" button; clicking it transitions everyone to the game.
With 1 player, the button is disabled for the host.

**Acceptance Scenarios**:

1. **Given** the host is in the lobby with at least 2 participants (including
   themselves), **When** they click "Start Game", **Then** the room transitions
   to the game state and all participants are navigated to the game page.

2. **Given** the host is the only participant in the lobby, **When** they view
   the lobby, **Then** the "Start Game" button is disabled with a message
   indicating more players are needed.

3. **Given** a non-host participant is in the lobby, **When** they view the
   lobby, **Then** no "Start Game" control is available to them.

---

### Edge Cases

- What happens if the host navigates away or closes the browser? The room
  closes and all remaining participants are redirected to the start page.
- What if two players submit the same room code simultaneously? Each join
  request is handled independently; both succeed if the room is still in lobby state.
- What if a player name is only whitespace? Treated as empty — rejected
  with the same "name required" error.

---

## Requirements

### Functional Requirements

- **FR-001**: A player MUST provide a name (1–30 non-whitespace characters)
  to create or join a room; whitespace-only names are treated as empty.
- **FR-002**: The system MUST assign host status to the first participant
  who creates the room.
- **FR-003**: Each room MUST have a unique, human-readable code that
  participants use to join.
- **FR-004**: A player attempting to join with an empty or missing room code
  MUST receive a clear validation error before any server request is made.
- **FR-005**: A player attempting to join with a room code that does not
  match an active room MUST receive a clear "Room not found" error.
- **FR-006**: A player attempting to join a room whose game has already
  started MUST be rejected with a clear "Game already in progress" error.
- **FR-007**: The lobby MUST automatically refresh participant data
  approximately every 2 seconds while the lobby page is visible.
- **FR-008**: When the host starts the game, all participants in the lobby
  MUST be automatically navigated to the game page within one polling cycle (~2 seconds).
- **FR-009**: Only the host MUST be able to trigger the game start action.
- **FR-010**: The game start action MUST be blocked (and the host informed)
  if fewer than 2 participants are present.
- **FR-011**: If the host leaves the lobby, the room MUST close and all
  remaining participants MUST be redirected to the start page.
- **FR-012**: Rooms MUST be fully isolated; actions in one room MUST NOT
  affect any other room.

### Key Entities

- **Room**: Identified by a unique code; has a status (lobby / in-progress);
  tracks its host and all participants.
- **Participant**: Has a display name and a unique identity within a room;
  one participant is designated as host.

---

## Success Criteria

- **SC-001**: A player can create a room and reach the lobby in under
  3 interactions (name input → submit → lobby).
- **SC-002**: A player can join an existing room in under 3 interactions
  (name input → code input → submit → lobby).
- **SC-003**: Invalid inputs (empty name, empty code, unknown code, game
  already started) are surfaced as clear, specific messages before or
  immediately after submission — no ambiguous or generic errors.
- **SC-004**: New participants appear in all open lobby views within
  2 seconds of joining, without any manual action by existing participants.
- **SC-005**: When the host starts the game, all lobby participants reach
  the game page within 2 seconds, without any manual navigation action.
- **SC-006**: A non-host participant cannot start the game under any
  circumstance.

---

## Assumptions

- Room codes are generated by the server and are not user-defined.
- A player's identity within a session is maintained via a participant ID
  returned at join/create time; no login or persistent account is required.
- "Host leaves" is detected when the polling call returns a 404 or a
  closed-room signal; there is no real-time disconnect event.
- Whitespace-only names are normalised to empty on the client before
  validation, so "   " is treated identically to "".
- The lobby polling interval is approximately 2 seconds; minor drift (±500 ms) is acceptable.
- Mobile/responsive layout is out of scope for this feature.
