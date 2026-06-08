import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { GuessForm } from "../components/GuessForm";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { api, type Point } from "../services/api";
import { useRoomState, useRoomStore } from "../state/roomStore";

const POLL_INTERVAL_MS = 2000;

export function GamePage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId } = useRoomState();
  const navigatingRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);

  // Redirect if no room in state
  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  // Polling — navigate on round-ended or room-closed
  useEffect(() => {
    if (!room) return;

    const poll = async () => {
      if (navigatingRef.current) return;
      try {
        const updated = await roomStore.fetchRoom();
        if (updated?.status === "round-ended") {
          navigatingRef.current = true;
          navigate("/results", { replace: true });
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

  // Render strokes onto canvas whenever they change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !room) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of room.strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [room?.strokes]);

  const getCanvasPoint = useCallback((canvas: HTMLCanvasElement, e: React.MouseEvent): Point => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY)
    };
  }, []);

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!room || !participantId) return;
    isDrawingRef.current = true;
    const pt = getCanvasPoint(e.currentTarget, e);
    currentPointsRef.current = [pt];
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current || !room || !participantId) return;
    const pt = getCanvasPoint(e.currentTarget, e);
    currentPointsRef.current.push(pt);

    // Live preview on drawer's own canvas
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || currentPointsRef.current.length < 2) return;
    const pts = currentPointsRef.current;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }

  async function handleMouseUp() {
    if (!isDrawingRef.current || !room || !participantId) return;
    isDrawingRef.current = false;
    const points = currentPointsRef.current;
    currentPointsRef.current = [];
    if (points.length < 1) return;
    try {
      await api.addStroke(room.code, participantId, points);
    } catch {
      // stroke failed to save — canvas will re-sync on next poll
    }
  }

  async function handleMouseLeave() {
    if (isDrawingRef.current) {
      await handleMouseUp();
    }
  }

  async function handleClear() {
    if (!room || !participantId) return;
    try {
      await api.clearStrokes(room.code, participantId);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch {
      // will re-sync on next poll
    }
  }

  async function handleGuessSubmit(text: string) {
    if (!room || !participantId) return;
    await api.submitGuess(room.code, participantId, text);
  }

  if (!room) {
    return null;
  }

  const viewer = room.participants.find((p) => p.id === participantId) ?? null;
  const isDrawer = room.drawerId === participantId;
  const drawerName = room.participants.find((p) => p.id === room.drawerId)?.name ?? "Unknown";

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Round 1</span>
          <h1 className="game-page__title">{isDrawer ? "Draw the Word!" : "Guess the Word!"}</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Card title="Scores">
            <ul className="player-list">
              {room.participants.map((p) => (
                <li key={p.id}>
                  <span>{p.name}{p.id === participantId ? " (you)" : ""}</span>
                  <span className="player-list__meta">{room.scores[p.id] ?? 0} pts</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>

        <div className="game-page__main">
          {isDrawer && room.secretWord ? (
            <Card title="Your word to draw">
              <p style={{ fontSize: "1.5rem", fontWeight: "bold", textAlign: "center", padding: "8px 0" }}>
                {room.secretWord}
              </p>
            </Card>
          ) : room.wordLength !== null ? (
            <Card title="Guess the word">
              <p style={{ textAlign: "center", padding: "8px 0" }}>
                {"_ ".repeat(room.wordLength).trim()}&nbsp;
                <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>({room.wordLength} letters)</span>
              </p>
            </Card>
          ) : null}

          <Card title="Canvas">
            <canvas
              ref={canvasRef}
              width={600}
              height={400}
              style={{
                width: "100%",
                height: "auto",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                cursor: isDrawer ? "crosshair" : "default",
                backgroundColor: "#ffffff",
                display: "block"
              }}
              onMouseDown={isDrawer ? handleMouseDown : undefined}
              onMouseMove={isDrawer ? handleMouseMove : undefined}
              onMouseUp={isDrawer ? handleMouseUp : undefined}
              onMouseLeave={isDrawer ? handleMouseLeave : undefined}
            />
            {isDrawer && (
              <div className="button-row button-row--compact" style={{ marginTop: "8px" }}>
                <button className="button button--secondary" onClick={handleClear}>
                  Clear Canvas
                </button>
              </div>
            )}
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

          {!isDrawer && (
            <Card title="Your Guess">
              <GuessForm onSubmit={handleGuessSubmit} />
            </Card>
          )}

          <Card title="Guess History">
            {room.guesses.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No guesses yet.</p>
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
