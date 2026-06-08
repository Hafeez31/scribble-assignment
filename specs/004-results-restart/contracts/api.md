# API Contracts: Results, Restart & Final Validation

**Branch**: `004-results-restart` | **Date**: 2026-06-08

## New Endpoint

### POST /rooms/:code/restart

Reset a round-ended room back to lobby state. Only the host may call this.

**Request**

```
POST /rooms/:code/restart
Content-Type: application/json

{
  "participantId": "uuid-string"
}
```

**Success Response** — `200 OK`

```json
{
  "room": {
    "code": "ABCD",
    "status": "lobby",
    "hostId": "uuid",
    "drawerId": null,
    "secretWord": null,
    "wordLength": null,
    "strokes": [],
    "guesses": [],
    "scores": {},
    "participants": [
      { "id": "uuid", "name": "Alice", "joinedAt": "ISO8601" },
      { "id": "uuid", "name": "Bob",   "joinedAt": "ISO8601" }
    ],
    "availableWords": ["..."],
    "roles": ["..."]
  }
}
```

**Error Responses**

| Status | Condition |
|--------|-----------|
| 404 | Room not found |
| 409 | Room status is not `"round-ended"` |
| 403 | `participantId` is not the host |

---

## Modified Behaviour: GET /rooms/:code

No request/response shape changes. Behavioural change only:

When `status === "round-ended"`, `secretWord` is returned as the full word string for **all** viewers (not just the drawer). `wordLength` is `null` for all viewers when `status === "round-ended"`.

| Field | `"in-progress"` (viewer = drawer) | `"in-progress"` (viewer = guesser) | `"round-ended"` (any viewer) |
|-------|------------------------------------|------------------------------------|------------------------------|
| `secretWord` | full word | `null` | full word |
| `wordLength` | `null` | letter count | `null` |
