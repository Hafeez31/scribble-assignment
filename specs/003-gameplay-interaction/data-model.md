---
description: "Data model changes for Gameplay Interaction"
---

# Data Model: Gameplay Interaction

## New Types

### `Point`

```
Point {
  x: number   — canvas X coordinate (pixels)
  y: number   — canvas Y coordinate (pixels)
}
```

### `Stroke`

```
Stroke {
  points: Point[]   — ordered array of points forming one continuous path
}
```

Minimum 1 point. Sent as a complete stroke when the pointer is released.

### `Guess`

```
Guess {
  participantId: string   — who submitted
  playerName: string      — denormalised name at submission time
  text: string            — trimmed guess text (stored after trim)
}
```

---

## Changes to Existing Models

### `RoomStatus` (`backend/src/models/game.ts`)

```
"lobby" | "in-progress"
→
"lobby" | "in-progress" | "round-ended"
```

`"round-ended"` is set when the first correct guess is received. Polling clients navigate to the game-end screen on this status.

### `Room` (storage) — new fields

| Field | Type | Default | Set when |
|-------|------|---------|----------|
| `strokes` | `Stroke[]` | `[]` | Initialised in `startRoom()`; appended by `addStroke()`; cleared by `clearStrokes()` |
| `guesses` | `Guess[]` | `[]` | Initialised in `startRoom()`; appended by `submitGuess()` |
| `scores` | `Record<string, number>` | `{}` | Initialised in `startRoom()` with all participant IDs → 0; updated by `submitGuess()` on correct guess |

```
Room {
  code: string
  hostId: string
  drawerId: string | null
  secretWord: string | null
  strokes: Stroke[]              ← NEW
  guesses: Guess[]               ← NEW
  scores: Record<string, number> ← NEW
  status: RoomStatus             ← expanded to include "round-ended"
  participants: Participant[]
  createdAt: string
  updatedAt: string
}
```

### `RoomSnapshot` (frontend-facing projection) — new fields

| Field | Type | Notes |
|-------|------|-------|
| `strokes` | `Stroke[]` | Full canvas state — all current strokes |
| `guesses` | `Guess[]` | Full guess history — all submitted guesses |
| `scores` | `Record<string, number>` | All participant scores |

```
RoomSnapshot {
  code: string
  hostId: string
  drawerId: string | null
  secretWord: string | null
  wordLength: number | null
  strokes: Stroke[]              ← NEW
  guesses: Guess[]               ← NEW
  scores: Record<string, number> ← NEW
  status: RoomStatus             ← expanded
  participants: Participant[]
  availableWords: string[]
  roles: ParticipantRole[]
}
```

---

## `startRoom()` Additional Initialisation

When game starts, the following are set alongside `drawerId` and `secretWord`:

```
room.strokes = []
room.guesses = []
room.scores  = Object.fromEntries(room.participants.map(p => [p.id, 0]))
```

---

## State Transitions

```
startRoom()
  Room.strokes = []
  Room.guesses = []
  Room.scores  = { alice: 0, bob: 0, ... }
  Room.status  = "in-progress"

addStroke(code, participantId, points)
  Room.strokes.push({ points })

clearStrokes(code, participantId)
  Room.strokes = []

submitGuess(code, participantId, text)
  trimmed = text.trim()
  Room.guesses.push({ participantId, playerName, text: trimmed })
  if trimmed.toLowerCase() === secretWord.toLowerCase()
    AND Room.status === "in-progress":
      Room.scores[participantId] = 100
      Room.status = "round-ended"
```

---

## Validation Rules

| Field | Rule |
|-------|------|
| `Stroke.points` | min 1 point; each point must have numeric x and y |
| `Guess.text` | non-empty after trim; max 100 characters (reasonable cap) |
| `addStroke` caller | must equal `room.drawerId` |
| `clearStrokes` caller | must equal `room.drawerId` |
| `submitGuess` caller | must NOT equal `room.drawerId` |
| `submitGuess` guard | room must be `"in-progress"` (not `"round-ended"`) |
