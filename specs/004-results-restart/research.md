# Research: Results, Restart & Final Validation

**Branch**: `004-results-restart` | **Date**: 2026-06-08

## Summary

No external research required. All decisions are derivable from the existing codebase patterns and the Scribble Constitution. Four in-codebase design decisions were made.

---

## Decision 1: Secret Word Visibility on Results Screen

**Decision**: Extend `toRoomSnapshot()` to expose `secretWord` to all viewers when `room.status === "round-ended"`.

**Rationale**: The current rule (drawer sees word, others see null + wordLength) only applies during `"in-progress"`. Post-round, revealing the word to all is the intended behaviour and aligns with every real word-guessing game. A single `||` condition on the existing `isDrawer` check handles it — no new parameters or functions.

**Alternatives considered**:
- Separate `toResultsSnapshot()` — rejected; duplication with no benefit
- Client-side reveal (store word in frontend state on correct guess) — rejected; violates server-as-source-of-truth principle

---

## Decision 2: Restart Endpoint

**Decision**: `POST /rooms/:code/restart` with body `{ participantId }`. Returns `{ room: RoomSnapshot }` of the reset lobby.

**Rationale**: POST is semantically correct for a state mutation. Consistent with `POST /rooms/:code/start`. Body-carried `participantId` matches every other mutation endpoint in the API.

**Guards (in order)**:
1. 404 — room not found
2. 409 — status is not `"round-ended"` (restart only valid from end state)
3. 403 — caller is not the host

**Alternatives considered**:
- `PATCH /rooms/:code` — more RESTful but adds complexity for a single action; rejected
- `DELETE` + `POST /rooms` — would change room code, breaking the preserve-players requirement; rejected

---

## Decision 3: `restartRoom()` Service

**Decision**: Mutate room in the `Map`, reset all round fields, preserve participants/hostId, return `structuredClone`.

**Fields reset**: `status → "lobby"`, `strokes → []`, `guesses → []`, `scores → {}`, `drawerId → null`, `secretWord → null`, `updatedAt → now()`.

**Fields preserved**: `code`, `hostId`, `participants`, `createdAt`.

**Rationale**: Mirrors `startRoom()` pattern exactly. Store owns all mutation; route handler only validates and calls.

---

## Decision 4: ResultsPage Guard and Polling

**Decision**: On mount, if `!room || room.status !== "round-ended"`, navigate to `/` immediately. Polling every 2 000 ms; on `status === "lobby"` navigate to `/lobby`; on 404 navigate to `/`.

**Rationale**: Identical guard pattern to `GamePage` (`status !== "in-progress"` → redirect). Identical polling pattern to `LobbyPage`. No new patterns introduced.
