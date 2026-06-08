import { randomUUID } from "node:crypto";
import type { Guess, Participant, Point, Room, RoomSnapshot, Stroke } from "../models/game.js";
import { STARTER_ROLES, STARTER_WORDS } from "../seed/starterData.js";

const rooms = new Map<string, Room>();

function now() {
  return new Date().toISOString();
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function generateUniqueCode() {
  let code = generateCode();

  while (rooms.has(code)) {
    code = generateCode();
  }

  return code;
}

function createParticipant(name: string): Participant {
  return {
    id: randomUUID(),
    name,
    joinedAt: now()
  };
}

function cloneRoom(room: Room) {
  return structuredClone(room);
}

export function listWords() {
  return [...STARTER_WORDS];
}

export function createRoom(playerName: string) {
  const participant = createParticipant(playerName);
  const room: Room = {
    code: generateUniqueCode(),
    hostId: participant.id,
    drawerId: null,
    secretWord: null,
    strokes: [],
    guesses: [],
    scores: {},
    status: "lobby",
    participants: [participant],
    createdAt: now(),
    updatedAt: now()
  };

  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function joinRoom(code: string, playerName: string) {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  const participant = createParticipant(playerName);
  room.participants.push(participant);
  room.updatedAt = now();
  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function getRoom(code: string) {
  const room = rooms.get(code);
  return room ? cloneRoom(room) : null;
}

export function saveRoom(room: Room) {
  room.updatedAt = now();
  rooms.set(room.code, cloneRoom(room));
  return getRoom(room.code);
}

export function startRoom(code: string): Room | null {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  room.drawerId = room.hostId;
  room.secretWord = STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)];
  room.strokes = [];
  room.guesses = [];
  room.scores = Object.fromEntries(room.participants.map((p) => [p.id, 0]));
  room.status = "in-progress";
  room.updatedAt = now();
  rooms.set(room.code, room);

  return cloneRoom(room);
}

export function addStroke(code: string, points: Point[]): Room | null {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  room.strokes.push({ points });
  room.updatedAt = now();
  rooms.set(room.code, room);

  return cloneRoom(room);
}

export function clearStrokes(code: string): Room | null {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  room.strokes = [];
  room.updatedAt = now();
  rooms.set(room.code, room);

  return cloneRoom(room);
}

export function submitGuess(
  code: string,
  participantId: string,
  text: string
): { correct: boolean } | null {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  const playerName = room.participants.find((p) => p.id === participantId)?.name ?? "Unknown";
  const guess: Guess = { participantId, playerName, text };
  room.guesses.push(guess);

  const correct =
    room.status === "in-progress" &&
    room.secretWord !== null &&
    text.toLowerCase() === room.secretWord.toLowerCase();

  if (correct) {
    room.scores[participantId] = 100;
    room.status = "round-ended";
  }

  room.updatedAt = now();
  rooms.set(room.code, room);

  return { correct };
}

export function toRoomSnapshot(room: Room, viewerParticipantId?: string): RoomSnapshot {
  const isDrawer = viewerParticipantId !== undefined && viewerParticipantId === room.drawerId;
  return {
    code: room.code,
    hostId: room.hostId,
    drawerId: room.drawerId,
    secretWord: isDrawer ? room.secretWord : null,
    wordLength: !isDrawer && room.secretWord !== null ? room.secretWord.length : null,
    strokes: room.strokes.map((s: Stroke) => ({ points: [...s.points] })),
    guesses: room.guesses.map((g: Guess) => ({ ...g })),
    scores: { ...room.scores },
    status: room.status,
    participants: room.participants.map((participant) => ({ ...participant })),
    availableWords: listWords(),
    roles: [...STARTER_ROLES]
  };
}
