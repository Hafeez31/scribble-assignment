# Quickstart Validation Guide: Room Setup & Lobby

**Feature**: 001-room-setup-lobby

Use these scenarios to validate the feature works end-to-end after implementation.

---

## Prerequisites

```bash
# Terminal 1 — backend
cd backend && npm run dev
# Backend listens on http://localhost:3001

# Terminal 2 — frontend
cd frontend && npm run dev
# Frontend at http://localhost:5173
```

---

## Scenario 1: Host creates a room

1. Open `http://localhost:5173`
2. Click **Create Room**
3. Enter name `Alice` → click **Create**
4. **Expected**: Lobby page shows room code (e.g. `AB3K`), `Alice` listed as participant with host indicator

---

## Scenario 2: Name validation on create

1. On the Create Room form, submit with **empty name**
2. **Expected**: Error shown immediately, no network request made
3. Submit with name `A` (1 char) → **Expected**: succeeds
4. Submit with name 31 characters long → **Expected**: Error shown, submission blocked

---

## Scenario 3: Guest joins with valid code

1. Open a second browser tab at `http://localhost:5173`
2. Click **Join Room**, enter name `Bob` and the code from Scenario 1
3. **Expected**: Bob appears in the lobby on both tabs within ~2 seconds (auto-poll)

---

## Scenario 4: Join with invalid code

1. On the Join Room form, submit with an **empty code**
2. **Expected**: Error shown immediately, no network request
3. Enter a non-existent code (e.g. `ZZZZ`) → click **Join**
4. **Expected**: Error message "Room not found"

---

## Scenario 5: Lobby auto-updates

1. Alice is in the lobby (Scenario 1)
2. In a second tab, Bob joins (Scenario 3)
3. **Expected**: Alice's lobby shows Bob within ~2 seconds — no manual refresh needed
4. Verify the manual **Refresh Room** button still works as a fallback

---

## Scenario 6: Only host can start game

1. With Alice (host) and Bob in the lobby:
   - On Bob's tab: **Expected**: No active "Start Game" button, or button is disabled/absent
   - On Alice's tab: **Expected**: "Start Game" button is enabled

---

## Scenario 7: Start game requires ≥2 players

1. Alice is alone in the lobby
2. **Expected**: "Start Game" button is disabled with a message like "Need at least 2 players"

---

## Scenario 8: Host starts the game

1. Alice and Bob are in the lobby
2. Alice clicks **Start Game**
3. **Expected**:
   - Alice is navigated to `/game` immediately
   - Bob's tab auto-navigates to `/game` within ~2 seconds (via poll detecting `status: "in-progress"`)

---

## Scenario 9: Join rejected after game starts

1. After Scenario 8, open a new tab and attempt to join the same room code
2. **Expected**: Error message "Game already in progress"

---

## Scenario 10: Room closed (host leaves)

> Manual test for the polling-based close detection.

1. Alice (host) and Bob are in the lobby
2. Close Alice's tab (simulate host leaving)
3. *(Note: actual room deletion on host disconnect is a future feature — for now, verify
   that if the room is manually deleted from memory or returns 404, Bob's lobby redirects to `/`)*

---

## API Smoke Tests (curl)

```bash
# Create room
curl -s -X POST http://localhost:3001/rooms \
  -H "Content-Type: application/json" \
  -d '{"playerName":"Alice"}' | jq .

# Join room (replace AB3K with actual code)
curl -s -X POST http://localhost:3001/rooms/AB3K/join \
  -H "Content-Type: application/json" \
  -d '{"playerName":"Bob"}' | jq .

# Start game (replace codes/IDs with actual values)
curl -s -X POST http://localhost:3001/rooms/AB3K/start \
  -H "Content-Type: application/json" \
  -d '{"participantId":"<alice-participant-id>"}' | jq .

# Poll room
curl -s http://localhost:3001/rooms/AB3K | jq .room.status

# Join after started (expect 409)
curl -s -X POST http://localhost:3001/rooms/AB3K/join \
  -H "Content-Type: application/json" \
  -d '{"playerName":"Charlie"}' | jq .
```
