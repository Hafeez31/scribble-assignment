---
description: "Manual validation scenarios for Game Start & Drawer Flow"
---

# Quickstart: Game Start & Drawer Flow

## Prerequisites

- Backend running: `cd backend && npm run dev` (port 3001)
- Frontend running: `cd frontend && npm run dev` (port 5173)
- Two browser tabs open (Tab A = host, Tab B = guest)

---

## Scenario 1: Drawer Is Assigned to the Host

**Goal**: Verify the host becomes the drawer when the game starts.

1. Tab A: Create a room as "Alice"
2. Tab B: Join the room as "Bob" using the room code
3. Tab A: Click "Start Game"
4. Tab A lands on the Game page
5. **Expected**: Tab A shows Alice as the active drawer
6. Tab B polls and auto-navigates to the Game page
7. **Expected**: Tab B also shows Alice as the active drawer

---

## Scenario 2: Drawer Sees the Secret Word

**Goal**: Verify the full secret word is shown to the drawer.

1. Complete Scenario 1
2. On Tab A (Alice = drawer):
   - **Expected**: A secret word from the starter list (`rocket`, `pizza`, `castle`, `guitar`, `sunflower`) is visibly displayed
   - The word is not masked or hidden

---

## Scenario 3: Non-Drawer Sees Only Word Length

**Goal**: Verify non-drawers cannot see the word but do see the letter count.

1. Complete Scenario 1
2. On Tab B (Bob = guesser):
   - **Expected**: The secret word text is NOT shown
   - **Expected**: A hint like "5 letters" or equivalent letter count is displayed
   - The hint count should match the actual word length (e.g., "rocket" = 6 letters)

---

## Scenario 4: Server-Side Word Secrecy (API Inspection)

**Goal**: Confirm the backend never sends the word to a non-drawer.

After starting a game as Alice (host/drawer), run these curl commands. Replace `{CODE}` with the room code, `{ALICE_ID}` with Alice's participantId, and `{BOB_ID}` with Bob's participantId.

```bash
# Drawer's view — secretWord MUST be present
curl "http://localhost:3001/rooms/{CODE}?participantId={ALICE_ID}" | jq '.room.secretWord'
# Expected: "rocket" (or whichever word was selected)

# Non-drawer's view — secretWord MUST be null
curl "http://localhost:3001/rooms/{CODE}?participantId={BOB_ID}" | jq '.room.secretWord'
# Expected: null

# Non-drawer wordLength MUST be non-null
curl "http://localhost:3001/rooms/{CODE}?participantId={BOB_ID}" | jq '.room.wordLength'
# Expected: 6 (or the length of the selected word)

# No participantId — secretWord MUST be null
curl "http://localhost:3001/rooms/{CODE}" | jq '.room.secretWord'
# Expected: null
```

---

## Scenario 5: drawerId Is Visible to All Players

**Goal**: Confirm `drawerId` is the same value for both players and equals the host's participantId.

```bash
curl "http://localhost:3001/rooms/{CODE}?participantId={ALICE_ID}" | jq '.room.drawerId'
# Expected: "{ALICE_ID}"

curl "http://localhost:3001/rooms/{CODE}?participantId={BOB_ID}" | jq '.room.drawerId'
# Expected: "{ALICE_ID}" (same value — drawer is always the host)
```

---

## Scenario 6: Empty Word List Guard

**Goal**: Confirm game start is rejected if no words exist.

> This scenario requires temporarily emptying `STARTER_WORDS` in `backend/src/seed/starterData.ts`. Restore after testing.

```bash
# With STARTER_WORDS = [] and a 2-player lobby:
curl -X POST http://localhost:3001/rooms/{CODE}/start \
  -H "Content-Type: application/json" \
  -d '{"participantId":"{ALICE_ID}"}' | jq '.'
# Expected: 409 { "message": "No words available to start the game" }
```

---

## Scenario 7: Lobby State Has Null Game Fields

**Goal**: Confirm `drawerId`, `secretWord`, and `wordLength` are all null before game starts.

```bash
# After creating a room but before starting:
curl "http://localhost:3001/rooms/{CODE}?participantId={ALICE_ID}" | jq '{drawerId: .room.drawerId, secretWord: .room.secretWord, wordLength: .room.wordLength}'
# Expected: { "drawerId": null, "secretWord": null, "wordLength": null }
```

---

## Word Reference

The starter word list (`backend/src/seed/starterData.ts`):

| Word | Length |
|------|--------|
| rocket | 6 |
| pizza | 5 |
| castle | 6 |
| guitar | 6 |
| sunflower | 9 |
