---
description: "API contract changes for Gameplay Interaction"
---

# API Contracts: Gameplay Interaction

## New Endpoints

### `POST /rooms/:code/strokes` — Add a Stroke

**Auth**: drawer only (validated via `participantId` in body)

**Request**

```json
{
  "participantId": "uuid-drawer",
  "points": [
    { "x": 100, "y": 150 },
    { "x": 105, "y": 155 },
    { "x": 112, "y": 162 }
  ]
}
```

| Field | Type | Rules |
|-------|------|-------|
| `participantId` | string | must equal room's `drawerId` |
| `points` | `{x,y}[]` | min 1 element; x and y are numbers |

**Response — 200 OK**

```json
{ "ok": true }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Validation failure (empty points, missing fields) |
| 403 | `participantId` is not the drawer |
| 404 | Room not found |
| 409 | Room status is not `"in-progress"` |

---

### `DELETE /rooms/:code/strokes` — Clear Canvas

**Auth**: drawer only

**Request body**

```json
{ "participantId": "uuid-drawer" }
```

**Response — 200 OK**

```json
{ "ok": true }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 403 | Not the drawer |
| 404 | Room not found |
| 409 | Room not in-progress |

---

### `POST /rooms/:code/guesses` — Submit a Guess

**Auth**: guessers only (drawer is rejected)

**Request**

```json
{
  "participantId": "uuid-guesser",
  "text": "rocket"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `participantId` | string | must NOT equal room's `drawerId` |
| `text` | string | trimmed min 1 char, max 100 chars |

**Response — 200 OK** (incorrect guess or round already ended)

```json
{ "correct": false }
```

**Response — 200 OK** (first correct guess)

```json
{ "correct": true }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Empty/whitespace-only text after trim |
| 403 | `participantId` is the drawer |
| 404 | Room not found |
| 409 | Room not in-progress (or already round-ended) |

---

## Modified Endpoints

### `GET /rooms/:code` — Extended Snapshot

The existing polling endpoint now returns `strokes`, `guesses`, `scores`, and the expanded `status` (which can now be `"round-ended"`).

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
    "strokes": [
      { "points": [{"x": 100, "y": 150}, {"x": 105, "y": 155}] }
    ],
    "guesses": [
      { "participantId": "uuid-bob", "playerName": "Bob", "text": "pizza" }
    ],
    "scores": {
      "uuid-host": 0,
      "uuid-bob": 0
    },
    "participants": [...],
    "availableWords": [...],
    "roles": [...]
  }
}
```

When `status` becomes `"round-ended"`, clients navigate to the game-end screen.

> All existing error responses unchanged. `secretWord` / `wordLength` personalisation from Feature 2 still applies.
