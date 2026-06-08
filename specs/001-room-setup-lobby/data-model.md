# Data Model: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-08

---

## Changed Types

### `RoomStatus` — `backend/src/models/game.ts`

```typescript
// Before
export type RoomStatus = "lobby";

// After
export type RoomStatus = "lobby" | "in-progress";
```

---

### `Room` — `backend/src/models/game.ts`

```typescript
// Before
export interface Room {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}

// After — add hostId
export interface Room {
  code: string;
  hostId: string;          // participant ID of the room creator
  status: RoomStatus;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}
```

**Invariants**:
- `hostId` MUST be the `id` of the first participant (set at creation, never changed).
- `hostId` MUST always match an entry in `participants`.

---

### `RoomSnapshot` — `backend/src/models/game.ts`

```typescript
// Before
export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  availableWords: string[];
  roles: ParticipantRole[];
}

// After — add hostId, update status type
export interface RoomSnapshot {
  code: string;
  hostId: string;          // exposed so the frontend knows who controls game start
  status: RoomStatus;
  participants: Participant[];
  availableWords: string[];
  roles: ParticipantRole[];
}
```

---

### `RoomSnapshot` — `frontend/src/services/api.ts`

Mirror of the backend change. The frontend type must stay in sync:

```typescript
export interface RoomSnapshot {
  code: string;
  hostId: string;                       // NEW
  status: "lobby" | "in-progress";      // expanded from literal "lobby"
  participants: Participant[];
  availableWords: string[];
  roles: ParticipantRole[];
}
```

---

## Validation Rules

### Player Name (applies to create and join)

| Rule | Detail |
|------|--------|
| Required | MUST be present and non-empty after trimming |
| Min length | 1 character (after trim) |
| Max length | 30 characters (after trim) |
| Whitespace-only | Treated as empty — rejected |

**Backend Zod schema** (replaces the existing optional schemas):
```typescript
const playerNameSchema = z.string().trim().min(1).max(30);

export const createRoomSchema = z.object({ playerName: playerNameSchema });
export const joinRoomSchema   = z.object({ playerName: playerNameSchema });
```

### Start Game Request

| Rule | Detail |
|------|--------|
| `participantId` | Required string |
| Must match `room.hostId` | Otherwise 403 |
| `room.participants.length >= 2` | Otherwise 409 |
| `room.status === "lobby"` | Otherwise 409 (already started) |

---

## State Transitions

```
Room created
    │
    ▼
status: "lobby"
    │
    │  host calls POST /rooms/:code/start
    │  (≥ 2 participants, caller is host)
    ▼
status: "in-progress"
```

The `"in-progress"` state is terminal for this feature — no revert or reset is in scope.

---

## Impact on Existing Functions

| Function | Change |
|----------|--------|
| `createRoom(playerName)` | Name is now required (no fallback). Set `room.hostId = participant.id`. |
| `joinRoom(code, playerName)` | Name is now required. Return `null` for not-found, throw `HttpError(409)` for in-progress. |
| `toRoomSnapshot(room, ...)` | Include `hostId` in the returned snapshot. |
| `startRoom(code, participantId)` | **NEW** — validates host + count, sets `status = "in-progress"`, returns updated snapshot. |
