---
description: "Manual validation scenarios for Gameplay Interaction"
---

# Quickstart: Gameplay Interaction

## Prerequisites

- Backend: `cd backend && npm run dev` (port 3001)
- Frontend: `cd frontend && npm run dev` (port 5173)
- Two browser windows: Tab A = host/drawer, Tab B = guesser

---

## Scenario 1: Drawer Sees Their Own Strokes

1. Complete the full lobby + game-start flow (Alice hosts, Bob joins, Alice starts)
2. Tab A (Alice = drawer): draw a freehand line on the canvas
3. **Expected**: The stroke appears on Tab A immediately (drawn client-side)

---

## Scenario 2: Guessers See the Drawing via Polling

1. Complete Scenario 1
2. Wait up to 2 seconds
3. **Expected**: Tab B (Bob = guesser) shows the same stroke that Alice drew — canvas matches
4. Alice draws a second stroke
5. Wait up to 2 seconds
6. **Expected**: Tab B now shows both strokes

---

## Scenario 3: Clear Canvas

1. With strokes visible on both tabs, Alice clicks "Clear"
2. **Expected**: Tab A canvas goes blank immediately
3. Wait up to 2 seconds
4. **Expected**: Tab B canvas also goes blank

---

## Scenario 4: Guesser Submits an Incorrect Guess

1. Tab B: type a wrong word and submit (e.g. "banana")
2. **Expected**: "banana" with Bob's name appears in the guess history on Tab B
3. Wait up to 2 seconds
4. **Expected**: "banana" also appears in Tab A's guess history

---

## Scenario 5: Empty Guess Is Rejected

1. Tab B: submit an empty or whitespace-only guess
2. **Expected**: An inline error message appears; the history is unchanged; no server request is made (or server returns 400)

---

## Scenario 6: First Correct Guess Scores 100 and Ends the Round

1. Tab B: submit the correct word (check `secretWord` via curl if needed — see below)
2. **Expected**: `correct: true` in the response
3. Within ~2 seconds both Tab A and Tab B navigate to the game-end screen
4. Scores before navigation: Bob = 100, Alice = 0

---

## Scenario 7: Subsequent Correct Guess Does Not Score

1. Before the round ends, have a third tab (Carol) in the game
2. Bob submits the correct word first (Carol has not yet)
3. Carol submits the correct word after Bob
4. **Expected**: Carol scores 0; round is already ended; both tabs navigate to game-end screen

---

## Scenario 8: Case-Insensitive Comparison

1. The selected word is "rocket"
2. Tab B submits "ROCKET"
3. **Expected**: Treated as correct — scores 100, round ends

---

## Scenario 9: Server-Side Drawer Guess Rejection

```bash
# Attempt to submit a guess as the drawer (Alice)
curl -X POST http://localhost:3001/rooms/{CODE}/guesses \
  -H "Content-Type: application/json" \
  -d '{"participantId":"{ALICE_ID}","text":"rocket"}'
# Expected: 403 { "message": "Drawer cannot submit guesses" }
```

---

## Scenario 10: Non-Drawer Cannot Add Strokes

```bash
# Bob attempts to add a stroke
curl -X POST http://localhost:3001/rooms/{CODE}/strokes \
  -H "Content-Type: application/json" \
  -d '{"participantId":"{BOB_ID}","points":[{"x":10,"y":20}]}'
# Expected: 403 { "message": "Only the drawer can add strokes" }
```

---

## Curl Reference

```bash
# Get Alice's participantId and secretWord (as drawer)
curl "http://localhost:3001/rooms/{CODE}?participantId={ALICE_ID}" | jq '{secretWord: .room.secretWord, scores: .room.scores}'

# Add a stroke as drawer
curl -X POST http://localhost:3001/rooms/{CODE}/strokes \
  -H "Content-Type: application/json" \
  -d '{"participantId":"{ALICE_ID}","points":[{"x":50,"y":60},{"x":55,"y":65}]}'

# Clear canvas
curl -X DELETE http://localhost:3001/rooms/{CODE}/strokes \
  -H "Content-Type: application/json" \
  -d '{"participantId":"{ALICE_ID}"}'

# Submit a guess
curl -X POST http://localhost:3001/rooms/{CODE}/guesses \
  -H "Content-Type: application/json" \
  -d '{"participantId":"{BOB_ID}","text":"rocket"}'
```
