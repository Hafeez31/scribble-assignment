import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { useRoomState, useRoomStore } from "../state/roomStore";

const POLL_INTERVAL_MS = 2000;

export function LobbyPage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId, error, isLoading } = useRoomState();
  const navigatingRef = useRef(false);

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  useEffect(() => {
    if (!room) return;

    const poll = async () => {
      if (navigatingRef.current) return;

      try {
        const updated = await roomStore.fetchRoom();

        if (updated?.status === "in-progress") {
          navigatingRef.current = true;
          navigate("/game", { replace: true });
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "";
        if (message.toLowerCase().includes("not found") || message.toLowerCase().includes("load room")) {
          navigatingRef.current = true;
          navigate("/", { replace: true });
        }
      }
    };

    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [navigate, room, roomStore]);

  if (!room) {
    return null;
  }

  const isHost = room.hostId === participantId;
  const canStart = room.participants.length >= 2;

  async function handleStartGame() {
    try {
      await roomStore.startGame();
      navigate("/game", { replace: true });
    } catch (caughtError) {
      // error is set in store by withLoading
    }
  }

  return (
    <section className="panel placeholder-page">
      <div className="lobby-header">
        <PageHeader
          kicker="Waiting for players"
          title="Lobby"
          description="Share the room code with friends so they can join your game."
        />
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="summary-grid">
        <Card title="Participants">
          {room.participants.length === 0 ? (
            <p>No participants are connected to this room yet.</p>
          ) : (
            <ul className="player-list">
              {room.participants.map((participant) => (
                <li key={participant.id}>
                  <span>{participant.name}</span>
                  <span className="player-list__meta">
                    {participant.id === room.hostId ? "host" : "joined"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Status">
          <p className="status-line" style={{ backgroundColor: isLoading ? "#fef3c7" : "#e0e7ff", color: isLoading ? "#b45309" : "#3730a3" }}>
            {isLoading ? "Updating..." : "Ready to play"}
          </p>
          <p style={{ marginTop: "8px" }}>
            {error ?? (isHost ? "You are the host." : "Waiting for the host to start the game.")}
          </p>
        </Card>
      </div>

      {isHost && (
        <div className="button-row button-row--spread">
          <button
            className="button button--primary"
            disabled={!canStart || isLoading}
            onClick={handleStartGame}
            title={canStart ? undefined : "Need at least 2 players"}
          >
            {canStart ? "Start Game" : "Need at least 2 players"}
          </button>
        </div>
      )}
    </section>
  );
}
