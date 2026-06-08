# Feature Specification: Results, Restart & Final Validation

**Feature Branch**: `004-results-restart`

**Created**: 2026-06-08

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Round Results (Priority: P1)

After a round ends, all players land on a results screen that reveals the secret word, shows every player's final score, and displays the full guess history. This gives all players closure and a clear picture of how the round played out.

**Why this priority**: Without a results screen, the round simply ends with no feedback — players have no way to see who won, what the word was, or what guesses were made. This is the core value of the feature.

**Independent Test**: Navigate to `/results` after a round ends — verify the secret word is displayed, all players appear with their scores (winner shows 100, others show 0), and the full guess history is listed in submission order.

**Acceptance Scenarios**:

1. **Given** a round has ended with one correct guesser, **When** any player views the results screen, **Then** they see the revealed secret word, the winner's score of 100, all other players at 0, and every guess submitted during the round in order.
2. **Given** a round ended with no correct guess (edge case — not reachable in current rules, but defensive), **When** the results screen loads, **Then** all scores show 0 and the full guess history is displayed.
3. **Given** a player navigates directly to `/results` when no round has ended (no room in state or room status is not `round-ended`), **When** the page loads, **Then** the player is immediately redirected to `/`.

---

### User Story 2 - Host Restarts the Game (Priority: P2)

The host can reset the room back to lobby state from the results screen, allowing another round to begin. All players — detected via polling — automatically navigate back to the lobby when the restart occurs.

**Why this priority**: Restart closes the game loop. Without it, the app is a dead-end after the first round. However, viewing results (US1) is a prerequisite: the host must see results before deciding to restart.

**Independent Test**: On the host's tab, click Restart — verify the host navigates to `/lobby`. On a second (non-host) tab, verify it navigates to `/lobby` within ~2 seconds via polling.

**Acceptance Scenarios**:

1. **Given** the host is on the results screen, **When** the host clicks "Restart", **Then** the room resets to lobby status, all round state is cleared, players and host identity are preserved, and the host navigates to `/lobby`.
2. **Given** a non-host player is on the results screen, **When** the host restarts (detected via polling), **Then** the non-host player navigates to `/lobby` automatically within the polling interval.
3. **Given** a non-host player is on the results screen, **When** they have not restarted, **Then** no restart button is visible to them — the screen is read-only.
4. **Given** the host restarts, **When** the lobby loads, **Then** all participants from the previous round are still present, the room code is unchanged, and the host is still the host.

---

### Edge Cases

- What happens when a player navigates directly to `/results` with no room state? → Redirect to `/`.
- What happens when a player navigates directly to `/results` but `room.status` is `"lobby"` or `"in-progress"`? → Redirect to `/`.
- What if the host clicks Restart more than once rapidly? → Second request is a no-op (room is already in lobby; the restart endpoint resets idempotently).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The results screen MUST display the secret word that was used in the round.
- **FR-002**: The results screen MUST display each participant's name and their final score.
- **FR-003**: The results screen MUST display the full guess history (player name + guess text) in submission order.
- **FR-004**: The results screen MUST be accessible to all players simultaneously (host and non-hosts).
- **FR-005**: Non-host players MUST NOT see a restart button on the results screen.
- **FR-006**: The host MUST see a "Restart" button on the results screen.
- **FR-007**: When the host triggers a restart, the room status MUST return to `lobby` and all round state (strokes, guesses, scores, drawer, secret word) MUST be cleared.
- **FR-008**: Participants and host identity MUST be preserved after a restart — same room code, same players, same host.
- **FR-009**: Non-host players MUST automatically navigate to `/lobby` when polling detects the room status has returned to `"lobby"`.
- **FR-010**: The host MUST navigate to `/lobby` immediately after triggering a restart.
- **FR-011**: If the results page is loaded without a round-ended room in state, the player MUST be redirected to `/`.

### Key Entities

- **Room**: Gains a `restart` operation — resets `status`, `strokes`, `guesses`, `scores`, `drawerId`, `secretWord` while preserving `participants`, `hostId`, `code`.
- **RoomSnapshot**: The existing snapshot returned on GET already includes `secretWord` (visible to drawer only) and `guesses`/`scores`. On the results screen, the secret word must be visible to all players — the snapshot must expose `secretWord` regardless of viewer identity when `status === "round-ended"`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All players see the results screen (secret word, scores, guess history) within the standard polling interval (~2 seconds) of the round ending.
- **SC-002**: After a host restart, all players are back in the lobby within the standard polling interval (~2 seconds).
- **SC-003**: 100% of players are preserved (same names, same room code) after a restart — no participant is lost.
- **SC-004**: A player who navigates directly to `/results` without an active round-ended session is redirected to `/` with no error shown.

## Assumptions

- The results page is only ever reached via the round-end navigation trigger from `GamePage` (polling detects `status === "round-ended"`). Direct URL access is treated as an invalid state and redirected.
- The secret word is revealed to all players on the results screen regardless of their role — the server-side snapshot rules (word hidden from non-drawers during `in-progress`) no longer apply once the round has ended.
- Restart is idempotent: if the room is already in `lobby` status, a second restart request has no harmful effect.
- No score persistence across rounds is required — scores reset completely on restart.
- The results screen does not need a countdown or automatic redirect; the host manually decides when to restart.
