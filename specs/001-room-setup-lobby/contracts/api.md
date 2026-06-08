# API Contracts: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Base URL**: `http://localhost:3001`

All requests and responses use `Content-Type: application/json`.

---

## Unchanged Endpoints (updated request/response shape)

### POST `/rooms` — Create Room

**Change**: `playerName` is now **required** (was optional).

**Request**:
```json
{ "playerName": "Alice" }
```

**Response 201**:
```json
{
  "participantId": "<uuid>",
  "room": {
    "code": "AB3K",
    "hostId": "<uuid>",
    "status": "lobby",
    "participants": [
      { "id": "<uuid>", "name": "Alice", "joinedAt": "<iso>" }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

**Response 400** — name missing, empty, or > 30 chars:
```json
{ "message": "Invalid request payload" }
```

---

### POST `/rooms/:code/join` — Join Room

**Change**: `playerName` now required; new 409 for in-progress rooms.

**Request**:
```json
{ "playerName": "Bob" }
```

**Response 200**:
```json
{
  "participantId": "<uuid>",
  "room": {
    "code": "AB3K",
    "hostId": "<uuid>",
    "status": "lobby",
    "participants": [
      { "id": "<uuid>", "name": "Alice", "joinedAt": "<iso>" },
      { "id": "<uuid>", "name": "Bob",   "joinedAt": "<iso>" }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

**Response 400** — name missing, empty, or > 30 chars:
```json
{ "message": "Invalid request payload" }
```

**Response 404** — room code not found:
```json
{ "message": "Room not found" }
```

**Response 409** — game already started:
```json
{ "message": "Game already in progress" }
```

---

### GET `/rooms/:code` — Fetch Room Snapshot

**Change**: `hostId` is now included in the response.

**Query params**: `?participantId=<uuid>` (optional)

**Response 200**:
```json
{
  "room": {
    "code": "AB3K",
    "hostId": "<uuid>",
    "status": "lobby",
    "participants": [...],
    "availableWords": [...],
    "roles": [...]
  }
}
```

**Response 404** — room not found (signals room closed to polling clients):
```json
{ "message": "Room not found" }
```

---

## New Endpoint

### POST `/rooms/:code/start` — Start Game

Transitions the room from `"lobby"` to `"in-progress"`. Only the host may call this,
and only when 2 or more participants are present.

**Request**:
```json
{ "participantId": "<uuid>" }
```

**Response 200**:
```json
{
  "room": {
    "code": "AB3K",
    "hostId": "<uuid>",
    "status": "in-progress",
    "participants": [...],
    "availableWords": [...],
    "roles": [...]
  }
}
```

**Response 403** — caller is not the host:
```json
{ "message": "Only the host can start the game" }
```

**Response 409** — fewer than 2 participants:
```json
{ "message": "At least 2 players are required to start" }
```

**Response 409** — game already started:
```json
{ "message": "Game already in progress" }
```

**Response 404** — room not found:
```json
{ "message": "Room not found" }
```

---

## Frontend Polling Contract

The lobby polls `GET /rooms/:code?participantId=<id>` every **2000 ms**.

| Response | Frontend action |
|----------|----------------|
| 200, `status: "lobby"` | Update participant list, stay on lobby |
| 200, `status: "in-progress"` | Navigate to `/game` |
| 404 | Navigate to `/` — room is closed |
| Other error | Display error message, continue polling |
