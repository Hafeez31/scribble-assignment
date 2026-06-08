import { Router } from "express";
import {
  addStrokeSchema,
  clearStrokesSchema,
  createRoomSchema,
  HttpError,
  joinRoomSchema,
  roomCodeParamsSchema,
  roomViewerQuerySchema,
  startRoomSchema,
  submitGuessSchema
} from "./schemas.js";
import {
  addStroke,
  clearStrokes,
  createRoom,
  getRoom,
  joinRoom,
  startRoom,
  submitGuess,
  toRoomSnapshot
} from "../services/roomStore.js";

export function createRoomsRouter() {
  const router = Router();

  router.post("/", (request, response, next) => {
    try {
      const { playerName } = createRoomSchema.parse(request.body);
      const result = createRoom(playerName);

      response.status(201).json({
        participantId: result.participantId,
        room: toRoomSnapshot(result.room)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/join", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { playerName } = joinRoomSchema.parse(request.body);
      const upperCode = code.toUpperCase();
      const existing = getRoom(upperCode);

      if (!existing) {
        throw new HttpError(404, "Room not found");
      }

      if (existing.status === "in-progress") {
        throw new HttpError(409, "Game already in progress");
      }

      const result = joinRoom(upperCode, playerName);

      if (!result) {
        throw new HttpError(404, "Room not found");
      }

      response.json({
        participantId: result.participantId,
        room: toRoomSnapshot(result.room)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/start", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = startRoomSchema.parse(request.body);
      const upperCode = code.toUpperCase();
      const room = getRoom(upperCode);

      if (!room) {
        throw new HttpError(404, "Room not found");
      }

      if (room.status === "in-progress") {
        throw new HttpError(409, "Game already in progress");
      }

      if (room.hostId !== participantId) {
        throw new HttpError(403, "Only the host can start the game");
      }

      if (room.participants.length < 2) {
        throw new HttpError(409, "At least 2 players are required to start");
      }

      const startedRoom = startRoom(upperCode);

      if (!startedRoom) {
        throw new HttpError(404, "Room not found");
      }

      response.json({ room: toRoomSnapshot(startedRoom, participantId) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/strokes", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId, points } = addStrokeSchema.parse(request.body);
      const upperCode = code.toUpperCase();
      const room = getRoom(upperCode);

      if (!room) {
        throw new HttpError(404, "Room not found");
      }

      if (room.status !== "in-progress") {
        throw new HttpError(409, "Game is not in progress");
      }

      if (room.drawerId !== participantId) {
        throw new HttpError(403, "Only the drawer can add strokes");
      }

      addStroke(upperCode, points);
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:code/strokes", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = clearStrokesSchema.parse(request.body);
      const upperCode = code.toUpperCase();
      const room = getRoom(upperCode);

      if (!room) {
        throw new HttpError(404, "Room not found");
      }

      if (room.status !== "in-progress") {
        throw new HttpError(409, "Game is not in progress");
      }

      if (room.drawerId !== participantId) {
        throw new HttpError(403, "Only the drawer can clear the canvas");
      }

      clearStrokes(upperCode);
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/guesses", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId, text } = submitGuessSchema.parse(request.body);
      const upperCode = code.toUpperCase();
      const room = getRoom(upperCode);

      if (!room) {
        throw new HttpError(404, "Room not found");
      }

      if (room.status !== "in-progress") {
        throw new HttpError(409, "Game is not in progress");
      }

      if (room.drawerId === participantId) {
        throw new HttpError(403, "Drawer cannot submit guesses");
      }

      const result = submitGuess(upperCode, participantId, text);

      if (!result) {
        throw new HttpError(404, "Room not found");
      }

      response.json({ correct: result.correct });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:code", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = roomViewerQuerySchema.parse(request.query);
      const room = getRoom(code.toUpperCase());

      if (!room) {
        throw new HttpError(404, "Unable to load room");
      }

      response.json({
        room: toRoomSnapshot(room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
