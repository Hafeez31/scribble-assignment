import { z } from "zod";

const playerNameSchema = z.string().trim().min(1).max(30);

export const createRoomSchema = z.object({
  playerName: playerNameSchema
});

export const joinRoomSchema = z.object({
  playerName: playerNameSchema
});

export const startRoomSchema = z.object({
  participantId: z.string()
});

export const addStrokeSchema = z.object({
  participantId: z.string(),
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(1)
});

export const clearStrokesSchema = z.object({
  participantId: z.string()
});

export const submitGuessSchema = z.object({
  participantId: z.string(),
  text: z.string().trim().min(1).max(100)
});

export const restartRoomSchema = z.object({
  participantId: z.string()
});

export const roomCodeParamsSchema = z.object({
  code: z.string()
});

export const roomViewerQuerySchema = z.object({
  participantId: z.string().optional()
});

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
