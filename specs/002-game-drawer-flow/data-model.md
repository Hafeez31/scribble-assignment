---
description: "Data model changes for Game Start & Drawer Flow"
---

# Data Model: Game Start & Drawer Flow

## Changes to Existing Models

### `Room` (backend storage — `backend/src/models/game.ts`)

Add two nullable fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `drawerId` | `string \| null` | `null` | `participantId` of the active drawer; `null` in lobby |
| `secretWord` | `string \| null` | `null` | The randomly selected secret word; `null` in lobby |

No other fields change.

```
Room {
  code: string          (unchanged)
  hostId: string        (unchanged)
  drawerId: string|null (NEW)
  secretWord: string|null (NEW)
  status: RoomStatus    (unchanged)
  participants: Participant[] (unchanged)
  createdAt: string     (unchanged)
  updatedAt: string     (unchanged)
}
```

### `RoomSnapshot` (frontend-facing projection — `backend/src/models/game.ts`)

Add three nullable fields:

| Field | Type | Lobby value | Drawer sees | Non-drawer sees |
|-------|------|-------------|-------------|-----------------|
| `drawerId` | `string \| null` | `null` | `participantId` of drawer | same |
| `secretWord` | `string \| null` | `null` | full word string | `null` |
| `wordLength` | `number \| null` | `null` | `null` | letter count of word |

```
RoomSnapshot {
  code: string           (unchanged)
  hostId: string         (unchanged)
  drawerId: string|null  (NEW)
  secretWord: string|null (NEW — populated only for the requesting drawer)
  wordLength: number|null (NEW — populated only for non-drawers when in-progress)
  status: RoomStatus     (unchanged)
  participants: Participant[] (unchanged)
  availableWords: string[] (unchanged)
  roles: ParticipantRole[] (unchanged)
}
```

---

## `toRoomSnapshot` Signature Change

`toRoomSnapshot(room: Room)` → `toRoomSnapshot(room: Room, viewerParticipantId?: string)`

Logic:
```
drawerId   = room.drawerId
isDrawer   = viewerParticipantId !== undefined && viewerParticipantId === room.drawerId
secretWord = isDrawer ? room.secretWord : null
wordLength = !isDrawer && room.secretWord !== null ? room.secretWord.length : null
```

---

## `startRoom` Return Type Change

`startRoom(code: string): RoomSnapshot | null`
→ `startRoom(code: string): Room | null`

Returns the mutated `Room` (cloned) so the calling route handler can call `toRoomSnapshot(room, participantId)` with the requester's identity.

---

## State Transitions

```
LOBBY state
  Room.drawerId  = null
  Room.secretWord = null
  RoomSnapshot.drawerId  = null
  RoomSnapshot.secretWord = null
  RoomSnapshot.wordLength = null

  [ host calls POST /rooms/:code/start ]
       ↓
IN-PROGRESS state
  Room.drawerId  = room.hostId  (set in startRoom())
  Room.secretWord = random word from STARTER_WORDS  (set in startRoom())

  GET /rooms/:code?participantId=<drawerId>
    → RoomSnapshot.drawerId  = drawerId
    → RoomSnapshot.secretWord = "rocket"   ← full word
    → RoomSnapshot.wordLength = null

  GET /rooms/:code?participantId=<other>
    → RoomSnapshot.drawerId  = drawerId
    → RoomSnapshot.secretWord = null       ← withheld
    → RoomSnapshot.wordLength = 6          ← letter count only
```

---

## Validation Rules

- `secretWord` must be a non-empty string selected from `STARTER_WORDS`; never an empty string, never a value outside the list
- `drawerId` must equal `room.hostId` when set (Feature 2 constraint; may diverge in future)
- If `STARTER_WORDS` is empty, game start is rejected before `drawerId` or `secretWord` are assigned
