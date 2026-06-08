export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "in-progress" | "round-ended";

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
}

export interface Guess {
  participantId: string;
  playerName: string;
  text: string;
}

export interface Participant {
  id: string;
  name: string;
  joinedAt: string;
}

export interface Room {
  code: string;
  hostId: string;
  drawerId: string | null;
  secretWord: string | null;
  strokes: Stroke[];
  guesses: Guess[];
  scores: Record<string, number>;
  status: RoomStatus;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomSnapshot {
  code: string;
  hostId: string;
  drawerId: string | null;
  secretWord: string | null;
  wordLength: number | null;
  strokes: Stroke[];
  guesses: Guess[];
  scores: Record<string, number>;
  status: RoomStatus;
  participants: Participant[];
  availableWords: string[];
  roles: ParticipantRole[];
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
