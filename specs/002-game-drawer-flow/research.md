---
description: "Design decisions for Game Start & Drawer Flow"
---

# Research: Game Start & Drawer Flow

## Decision 1: Word Secrecy — Parameterized Snapshot vs. Separate Endpoint

**Decision**: Extend the existing `GET /rooms/:code?participantId=...` endpoint to return a personalized snapshot. The `participantId` query param (already parsed but unused) is used to decide whether to include the full `secretWord` or only a `wordLength` hint.

**Rationale**: A separate `/game-state` endpoint would duplicate polling infrastructure and complicate the frontend client. Personalizing the existing `toRoomSnapshot()` function with a `viewerParticipantId` argument is minimally invasive and keeps all room/game state flowing through one consistent path. The server never sends the word to anyone whose `participantId` does not match `drawerId` — enforcement is at the service layer.

**Alternatives considered**:
- Separate `GET /rooms/:code/game-state` endpoint — rejected: duplicates route + polling logic, adds surface area without benefit.
- Client-side masking only — rejected: violates FR-007 (server-side enforcement required).

---

## Decision 2: `startRoom()` Returns `Room`, Not `RoomSnapshot`

**Decision**: Change `startRoom(code)` to return `Room | null` (matching the pattern of `createRoom`/`joinRoom`) and let the route handler call `toRoomSnapshot(room, participantId)`.

**Rationale**: The current `startRoom()` returns a `RoomSnapshot` but cannot personalise it without knowing the requesting `participantId`. Moving snapshot creation to the route handler (where `participantId` is available from the request body) allows the `POST /:code/start` response to include the full `secretWord` for the host/drawer immediately — no second polling round required.

**Alternatives considered**:
- Pass `viewerParticipantId` into `startRoom()` — rejected: pollutes the service layer with request-context concerns.
- Return snapshot without the word and require a follow-up GET — rejected: UX lag; drawer would see a blank word until the next poll cycle.

---

## Decision 3: `drawerId` as Separate Field (Not Reusing `hostId` in the Snapshot)

**Decision**: Add `drawerId: string | null` to both `Room` (storage) and `RoomSnapshot` (projection). In Feature 2 this is always equal to `hostId`, but the fields are kept separate.

**Rationale**: Future features may rotate the drawer each round. Storing `drawerId` independently ensures the game model is not locked to the host identity. The frontend derives `isDrawer = room.drawerId === participantId` without caring whether the drawer happens to be the host.

**Alternatives considered**:
- Frontend derives `isDrawer = room.hostId === participantId` — rejected: couples drawer identity to host identity in the client; breaks if drawer rotation is ever added.

---

## Decision 4: Random Word Selection via `Math.random()` on `STARTER_WORDS`

**Decision**: `startRoom()` picks a word using `STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)]`. The `STARTER_WORDS` array is the single source of truth (5 words in `starterData.ts`).

**Rationale**: `Math.random()` is appropriate for a casual game with no security or reproducibility requirement. The word list is small and fixed; no deduplication across games is needed.

**Alternatives considered**:
- Seeded / deterministic selection — rejected: no requirement for reproducibility; adds complexity with no benefit.
- Cross-game deduplication — rejected: out of scope; each game is independent.

---

## Decision 5: Empty Word List Guard in Route Handler

**Decision**: The `POST /:code/start` route checks `STARTER_WORDS.length === 0` and throws `HttpError(409, "No words available to start the game")` before calling the service.

**Rationale**: Keeps the service pure (no dependency on the seed array length at call sites). The guard is a startup-time invariant check that should never fire with the seeded data — placing it in the route handler follows the pattern of other business-rule guards (player count, host identity).

---

## Decision 6: Null Fields in Lobby State

**Decision**: `Room.drawerId` and `Room.secretWord` are both `null` until game start. `RoomSnapshot` mirrors this with nullable fields throughout the lobby phase.

**Rationale**: Nullable fields explicitly signal "game not started yet" vs. a missing or undefined value. Frontend code can branch on `room.drawerId !== null` to decide whether to render game-specific UI vs. lobby UI without checking `room.status` in multiple places.

---

## Decision 7: GamePage Polling Cadence

**Decision**: `GamePage.tsx` polls at the same 2000 ms interval as `LobbyPage.tsx`, using the identical `setInterval + cleanup` pattern and calling `roomStore.fetchRoom()`.

**Rationale**: Consistency with the lobby pattern. In Feature 2 the game state does not change after start (no round transitions), so polling is low-activity but provides a natural foundation for future features that will mutate game state (guesses, round end). No new polling infrastructure is introduced.
