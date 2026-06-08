# Data Model: Results, Restart & Final Validation

**Branch**: `004-results-restart` | **Date**: 2026-06-08

## Changes to Existing Entities

### Room (existing — `backend/src/models/game.ts`)

No new fields. `RoomStatus` already includes `"round-ended"` from Feature 3.

**State transition added**:

```
"round-ended" → restartRoom() → "lobby"
```

Full state machine after this feature:

```
"lobby" ──startRoom()──► "in-progress" ──submitGuess(correct)──► "round-ended"
   ▲                                                                      │
   └──────────────────────restartRoom()──────────────────────────────────┘
```

### RoomSnapshot (existing — `backend/src/models/game.ts`)

No new fields. Behaviour change only:

| Field | During `"in-progress"` | During `"round-ended"` |
|-------|----------------------|----------------------|
| `secretWord` | Drawer: full word; others: `null` | **All players: full word** |
| `wordLength` | Non-drawers: letter count; drawer: `null` | `null` for all (word is revealed) |

## New Service Function

### `restartRoom(code: string): Room | null`

Located in `backend/src/services/roomStore.ts`.

| Field | Before | After |
|-------|--------|-------|
| `status` | `"round-ended"` | `"lobby"` |
| `strokes` | `[...strokes]` | `[]` |
| `guesses` | `[...guesses]` | `[]` |
| `scores` | `{ id: number, ... }` | `{}` |
| `drawerId` | `string` | `null` |
| `secretWord` | `string` | `null` |
| `updatedAt` | old timestamp | `now()` |
| `participants` | unchanged | unchanged |
| `hostId` | unchanged | unchanged |
| `code` | unchanged | unchanged |

## New Zod Schema

### `restartRoomSchema` (in `backend/src/api/schemas.ts`)

```
{ participantId: string (non-empty) }
```

## New API Endpoint

`POST /rooms/:code/restart` — see `contracts/api.md` for full contract.
