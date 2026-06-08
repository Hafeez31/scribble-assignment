export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "in-progress";

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
  status: RoomStatus;
  participants: Participant[];
  availableWords: string[];
  roles: ParticipantRole[];
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
