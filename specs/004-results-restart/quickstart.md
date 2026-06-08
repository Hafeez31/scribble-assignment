# Quickstart: Results, Restart & Final Validation

**Branch**: `004-results-restart` | **Date**: 2026-06-08

## Prerequisites

- Backend running: `cd backend && npm run dev` (port 3001)
- Frontend running: `cd frontend && npm run dev` (port 5173)
- Two browser tabs open at `http://localhost:5173`

## Setup: Reach a Round-Ended State

1. **Tab A** — Create a room (enter name "Alice", click "Create Room") → note the room code
2. **Tab B** — Join the room (enter name "Bob", enter room code, click "Join")
3. **Tab A** (host/Alice) — Click "Start Game"
4. Both tabs should navigate to `/game`
5. **Tab A** (drawer) — Draw anything on the canvas
6. **Tab B** (Bob) — Look at the word length hint; type the correct word (ask Tab A's "Your word to draw" card) → submit
7. Both tabs should navigate to `/results` within ~2 seconds

---

## Scenario 1: Results Screen Displays Correct Data

**On both Tab A and Tab B, verify:**
- The secret word is displayed (e.g., "elephant")
- Bob's score shows 100
- Alice's score shows 0
- The full guess history is shown with Bob's guess text

**Expected**: All three data items visible on both tabs simultaneously.

---

## Scenario 2: Non-Host Cannot Restart

**On Tab B (Bob, non-host):**
- Verify there is **no** "Restart" button visible

**Expected**: Results screen is read-only for non-hosts.

---

## Scenario 3: Host Restarts — All Players Return to Lobby

**On Tab A (Alice, host):**
- Click "Restart"
- Tab A should immediately navigate to `/lobby`
- Tab A lobby shows all participants preserved (Alice + Bob) and same room code

**On Tab B (Bob):**
- Within ~2 seconds, Tab B should automatically navigate to `/lobby`
- Tab B lobby shows the same participants

**Expected**: Both tabs in `/lobby` with same players, same room code, ready for a new round.

---

## Scenario 4: Invalid Direct Navigation to /results

**With no active game session:**
- Open a new tab and navigate directly to `http://localhost:5173/results`
- Tab should immediately redirect to `http://localhost:5173/`

**Expected**: Redirect to home, no error shown.

---

## Scenario 5: Restart Is Idempotent

**After a successful restart (both in lobby):**
- Manually call `POST /rooms/:code/restart` again (via curl or browser dev tools) with the host's participantId
- **Expected**: 409 response — "Room is not in round-ended state" (room is now `"lobby"`)

```bash
curl -X POST http://localhost:3001/rooms/ABCD/restart \
  -H "Content-Type: application/json" \
  -d '{"participantId":"<host-uuid>"}'
# → 409 Conflict
```
