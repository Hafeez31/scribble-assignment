import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { api } from "../services/api";
import { useRoomState, useRoomStore } from "../state/roomStore";

const POLL_INTERVAL_MS = 2000;

export function ResultsPage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId } = useRoomState();
  const navigatingRef = useRef(false);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    if (!room || room.status !== "round-ended") {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  useEffect(() => {
    if (!room || room.status !== "round-ended") return;

    const poll = async () => {
      if (navigatingRef.current) return;
      try {
        const updated = await roomStore.fetchRoom();
        if (updated?.status === "lobby") {
          navigatingRef.current = true;
          navigate("/lobby", { replace: true });
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

  async function handleRestart() {
    if (!room || !participantId) return;
    setRestartError(null);
    setIsRestarting(true);
    try {
      await api.restartRoom(room.code, participantId);
      navigatingRef.current = true;
      navigate("/lobby", { replace: true });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to restart";
      setRestartError(message);
    } finally {
      setIsRestarting(false);
    }
  }

  if (!room || room.status !== "round-ended") {
    return null;
  }

  const isHost = room.hostId === participantId;
  const winner = room.participants.find((p) => (room.scores[p.id] ?? 0) === 100);

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Round Over</span>
          <h1 className="game-page__title">Results</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Card title="Final Scores">
            <ul className="player-list">
              {room.participants.map((p) => (
                <li key={p.id}>
                  <span>
                    {p.name}
                    {p.id === participantId ? " (you)" : ""}
                    {p.id === winner?.id ? " 🏆" : ""}
                  </span>
                  <span className="player-list__meta">{room.scores[p.id] ?? 0} pts</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>

        <div className="game-page__main">
          <Card title="The Word Was">
            <p style={{ fontSize: "1.75rem", fontWeight: "bold", textAlign: "center", padding: "16px 0" }}>
              {room.secretWord}
            </p>
          </Card>

          <Card title="Guess History">
            {room.guesses.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No guesses were submitted.</p>
            ) : (
              <ul className="player-list">
                {room.guesses.map((g, i) => (
                  <li key={i}>
                    <span style={{ fontWeight: 500 }}>{g.playerName}</span>
                    <span className="player-list__meta" style={{ fontStyle: "italic" }}>{g.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="game-page__sidebar game-page__sidebar--right">
          <Card title="Game Info">
            <dl className="detail-list">
              <div>
                <dt>Room</dt>
                <dd>{room.code}</dd>
              </div>
              <div>
                <dt>Players</dt>
                <dd>{room.participants.length}</dd>
              </div>
              {winner && (
                <div>
                  <dt>Winner</dt>
                  <dd>{winner.name}</dd>
                </div>
              )}
            </dl>
          </Card>

          {isHost && (
            <Card title="Host Controls">
              {restartError && (
                <p style={{ color: "#ef4444", fontSize: "0.875rem", marginBottom: "8px" }}>{restartError}</p>
              )}
              <div className="button-row button-row--compact">
                <button
                  className="button button--primary"
                  onClick={handleRestart}
                  disabled={isRestarting}
                >
                  {isRestarting ? "Restarting..." : "Play Again"}
                </button>
              </div>
              <p style={{ color: "#6b7280", fontSize: "0.75rem", marginTop: "8px" }}>
                Returns everyone to the lobby with the same players.
              </p>
            </Card>
          )}

          {!isHost && (
            <Card title="Waiting">
              <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Waiting for the host to start a new round...
              </p>
            </Card>
          )}
        </aside>
      </div>
    </section>
  );
}
