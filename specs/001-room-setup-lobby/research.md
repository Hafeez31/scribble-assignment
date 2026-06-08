# Research: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-08

---

## Decision 1: Host Tracking

**Decision**: Add a `hostId: string` field to the `Room` model (and expose it in `RoomSnapshot`).

**Rationale**: The simplest approach that lets both backend and frontend determine who is the
host at any point. The host is always the creator — the first participant's `id` is stored as
`hostId` at room creation. No extra lookup required.

**Alternatives considered**:
- A boolean `isHost` flag on `Participant` — rejected because it scatters host state across
  the participants array and makes host transfer more complex.
- A separate host endpoint — rejected as unnecessary complexity.

---

## Decision 2: Game Start Endpoint

**Decision**: Add `POST /rooms/:code/start` with body `{ participantId }`. The backend
validates that `participantId === room.hostId` and `participants.length >= 2`, then sets
`room.status = "in-progress"`.

**Rationale**: Follows the existing route pattern in `rooms.ts`. A dedicated endpoint keeps
the transition explicit and validatable server-side (non-hosts cannot bypass by calling the
API directly).

**Alternatives considered**:
- `PATCH /rooms/:code` with `{ status: "in-progress" }` — rejected; a generic PATCH opens
  the door to arbitrary state mutations. A named action endpoint is safer.

---

## Decision 3: Room Status Type

**Decision**: Expand `RoomStatus` from `"lobby"` to `"lobby" | "in-progress"`.

**Rationale**: Minimal change to the existing union type. The `in-progress` value is the only
new state needed for this feature. Future states (e.g. `"finished"`) extend the same union.

---

## Decision 4: Join Guard for In-Progress Rooms

**Decision**: In `joinRoom()`, return a distinct sentinel (or throw directly in the route) that
maps to HTTP 409 "Game already in progress" when `room.status === "in-progress"`.

**Rationale**: Existing `joinRoom` returns `null` only for "room not found". We need to
distinguish "not found" (404) from "game started" (409). The cleanest approach is to have
`joinRoom` return `{ error: "in-progress" }` or throw an `HttpError(409, ...)` directly in
the route handler after checking `room.status` before adding the participant.

---

## Decision 5: Lobby Auto-Polling

**Decision**: Implement polling in `LobbyPage` using `useEffect` + `setInterval` at a 2000 ms
interval. The interval is cleared on component unmount. On each tick, call
`roomStore.fetchRoom()`. If the response room status is `"in-progress"`, navigate to `/game`.
If the fetch throws a 404-shaped error, navigate to `/` with a "Room closed" message.

**Rationale**: Matches the constitution's HTTP-polling-only constraint. `useEffect` cleanup
ensures no stale intervals after unmount. The existing `fetchRoom` method on the store
already calls `GET /rooms/:code` — we reuse it without modification.

**Alternatives considered**:
- Separate polling hook (`useRoomPolling`) — could be introduced later if polling is needed
  on other pages; out of scope for this feature.

---

## Decision 6: Player Name Validation

**Decision**: Validate player name on **both** frontend and backend.

- **Frontend**: trim the value, check `length >= 1 && length <= 30` before any API call.
  Whitespace-only names become empty after trimming and fail the `length >= 1` check.
- **Backend**: Zod schema uses `.min(1).max(30)` after `.trim()` transform on `playerName`.
  The existing `displayName()` fallback to `"Player"` is removed; name is now required.

**Rationale**: Frontend validation gives instant feedback (no network round-trip). Backend
validation is the authoritative guard per constitution principle II (Zod at all boundaries).

---

## Decision 7: Host-Left Detection

**Decision**: When the lobby poll returns a 404, the frontend treats this as "room closed"
and redirects all remaining participants to `/` with an explanatory message stored in the
store's `error` field.

**Rationale**: There is no real-time disconnect signal (constitution: no WebSockets). A 404
on `GET /rooms/:code` is the definitive signal that the room no longer exists. The backend
need not do anything special — the room simply disappears from the in-memory map when the
host explicitly leaves (future feature) or in this feature via a room-close endpoint if
added later. For now, the room persists even if the host disconnects — the poll 404 is the
observable signal.

> **Note**: Actual host-leave room deletion is deferred to a future feature. For this
> feature, the observable contract is: if the poll returns 404, the room is gone.
