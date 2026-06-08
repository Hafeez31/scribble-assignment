import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { GuessForm } from "../components/GuessForm";
import { ResultPanel } from "../components/ResultPanel";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { Scoreboard } from "../components/Scoreboard";
import { useRoomState, useRoomStore } from "../state/roomStore";

const POLL_INTERVAL_MS = 2000;

export function GamePage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId } = useRoomState();
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
        await roomStore.fetchRoom();
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

  const viewer = room.participants.find((participant) => participant.id === participantId) ?? null;
  const isDrawer = room.drawerId === participantId;
  const drawerName = room.participants.find((p) => p.id === room.drawerId)?.name ?? "Unknown";

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Round 1</span>
          <h1 className="game-page__title">Guess the Word!</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Scoreboard />
          <ResultPanel />
        </aside>

        <div className="game-page__main">
          {isDrawer && room.secretWord ? (
            <Card title="Your word to draw">
              <p style={{ fontSize: "1.5rem", fontWeight: "bold", textAlign: "center", padding: "12px 0" }}>
                {room.secretWord}
              </p>
            </Card>
          ) : room.wordLength !== null ? (
            <Card title="Guess the word">
              <p style={{ textAlign: "center", padding: "8px 0" }}>
                {"_ ".repeat(room.wordLength).trim()} &nbsp;
                <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>({room.wordLength} letters)</span>
              </p>
            </Card>
          ) : null}
          <Card title="Canvas">
            <div className="canvas-placeholder" style={{ minHeight: "400px", backgroundColor: "#ffffff", border: "1px solid #e5e7eb" }}>
              Waiting for drawer...
            </div>
          </Card>
        </div>

        <aside className="game-page__sidebar game-page__sidebar--right">
          <Card title="Player Info">
            <dl className="detail-list">
              <div>
                <dt>Name</dt>
                <dd>{viewer?.name ?? "Unknown player"}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{isDrawer ? "Drawer" : "Guesser"}</dd>
              </div>
              <div>
                <dt>Now drawing</dt>
                <dd>{drawerName}{isDrawer ? " (you)" : ""}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Your Guess">
            <GuessForm />
          </Card>
        </aside>
      </div>

      <div className="button-row">
        <button className="button button--secondary" onClick={() => navigate("/lobby")}>
          Exit Game
        </button>
      </div>
    </section>
  );
}
