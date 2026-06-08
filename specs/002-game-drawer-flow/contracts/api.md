---
description: "API contract changes for Game Start & Drawer Flow"
---

# API Contracts: Game Start & Drawer Flow

## Modified Endpoints

### `GET /rooms/:code` — Personalized Game Snapshot

This endpoint already exists. Its response shape is extended to include game state, and the `participantId` query parameter is now used to determine word visibility.

**Request**

```
GET /rooms/:code?participantId=<uuid>
```

| Param | Location | Required | Description |
|-------|----------|----------|-------------|
| `code` | path | yes | Room code (case-insensitive) |
| `participantId` | query | no | Requesting player's ID; drives word secrecy |

**Response — 200 OK**

```json
{
  "room": {
    "code": "AB12",
    "hostId": "uuid-host",
    "drawerId": "uuid-host",
    "status": "in-progress",
    "secretWord": "rocket",
    "wordLength": null,
    "participants": [...],
    "availableWords": [...],
    "roles": [...]
  }
}
```

> `secretWord` is only non-null when `participantId === drawerId`.
> `wordLength` is only non-null when `participantId !== drawerId` and game is in progress.
> In lobby state both are `null` for everyone.

**Response — 200 OK (non-drawer view)**

```json
{
  "room": {
    "code": "AB12",
    "hostId": "uuid-host",
    "drawerId": "uuid-host",
    "status": "in-progress",
    "secretWord": null,
    "wordLength": 6,
    "participants": [...],
    "availableWords": [...],
    "roles": [...]
  }
}
```

**Error responses** (unchanged from Feature 1)

| Status | Condition |
|--------|-----------|
| 404 | Room not found |

---

### `POST /rooms/:code/start` — Response Extended

This endpoint already exists. Its response now includes the full `secretWord` for the host (who is the drawer), because the host's `participantId` is used to build the snapshot.

**Request** (unchanged)

```json
{ "participantId": "uuid-host" }
```

**Response — 200 OK** (drawer's view)

```json
{
  "room": {
    "code": "AB12",
    "hostId": "uuid-host",
    "drawerId": "uuid-host",
    "status": "in-progress",
    "secretWord": "rocket",
    "wordLength": null,
    "participants": [...],
    "availableWords": [...],
    "roles": [...]
  }
}
```

**New error response**

| Status | Body | Condition |
|--------|------|-----------|
| 409 | `{ "message": "No words available to start the game" }` | `STARTER_WORDS` is empty |

All existing error responses (403 non-host, 409 already started, 409 < 2 players, 404 not found) remain unchanged.

---

## Unchanged Endpoints

`POST /rooms` (create) and `POST /rooms/:code/join` — both return a `RoomSnapshot` in lobby state. The new fields (`drawerId`, `secretWord`, `wordLength`) will be `null` in these responses. No behaviour change.
