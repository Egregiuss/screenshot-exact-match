import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Board, type BoardArrow } from "@/components/chess/Board";
import { EvalBar } from "@/components/chess/EvalBar";
import { CoachCard } from "@/components/chess/CoachCard";
import { DIFFICULTIES, getEngine, type Difficulty } from "@/lib/engine";
import { assessMove, pvToFens, QUALITY_META, uciToMove, type Assessment, type CoachLevel } from "@/lib/coach";
import { updateProgress } from "@/lib/progress";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play & Learn — Gambit Coach" },
      { name: "description", content: "Play chess against Stockfish at five levels while a coach explains every move you make." },
      { property: "og:title", content: "Play & Learn — Gambit Coach" },
      { property: "og:description", content: "Play against the computer with real-time coaching on every move." },
    ],
  }),
  component: PlayPage,
});

const START = new Chess().fen();
type Ply = { san: string; uci: string; fen: string; from: string; to: string };

function PlayPage() {
  const [mode, setMode] = useState<"ai" | "free">("ai");
  const [level, setLevel] = useState<Difficulty>("casual");
  const [color, setColor] = useState<"white" | "black">("white");
  const [coachLevel, setCoachLevel] = useState<CoachLevel>("beginner");
  const [plies, setPlies] = useState<Ply[]>([]);
  const [view, setView] = useState(0); // number of plies shown
  const [assess, setAssess] = useState<Record<number, Assessment>>({});
  const [pending, setPending] = useState<number | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [preview, setPreview] = useState<{ fens: string[]; sans: string[]; ucis: string[]; idx: number; label: string } | null>(null);
  const [hint, setHint] = useState<BoardArrow | null>(null);
  const gameId = useRef(0);

  const fenAt = (n: number) => (n === 0 ? START : plies[n - 1].fen);
  const current = fenAt(plies.length);
  const shownFen = preview ? preview.fens[preview.idx] : fenAt(view);
  const game = useMemo(() => new Chess(current), [current]);
  const myTurn = mode === "free" || game.turn() === color[0];
  const atLive = view === plies.length && !preview;

  const playUci = useCallback((uci: string, base: Ply[]) => {
    const c = new Chess(base.length ? base[base.length - 1].fen : START);
    const m = c.move(uciToMove(uci));
    const next = [...base, { san: m.san, uci, fen: c.fen(), from: m.from, to: m.to }];
    setPlies(next);
    setView(next.length);
    return next;
  }, []);

  // AI reply
  useEffect(() => {
    if (mode !== "ai" || game.isGameOver() || game.turn() === color[0]) return;
    const id = gameId.current;
    setAiThinking(true);
    const t = setTimeout(async () => {
      const best = await getEngine().bestMove(current, level);
      if (id !== gameId.current) return;
      setAiThinking(false);
      if (best) setPlies((p) => {
        if (p.length && p[p.length - 1].fen !== current) return p;
        const c = new Chess(current);
        const m = c.move(uciToMove(best));
        const next = [...p, { san: m.san, uci: best, fen: c.fen(), from: m.from, to: m.to }];
        setView(next.length);
        return next;
      });
    }, 350);
    return () => clearTimeout(t);
  }, [current, mode, color, level, game]);

  // Prefetch analysis on the player's turn so feedback is instant.
  useEffect(() => {
    if (myTurn && !game.isGameOver()) getEngine().analyse(current, { depth: 12, multipv: 3 }).catch(() => {});
  }, [current, myTurn, game]);

  // Game over bookkeeping
  useEffect(() => {
    if (!game.isGameOver() || plies.length < 2) return;
    const pg = new Chess();
    for (const p of plies) pg.move(p.san);
    const result = game.isCheckmate() ? (game.turn() === "w" ? "0-1" : "1-0") : "1/2-1/2";
    const mine = Object.values(assess).filter((a) => a.mover === color[0]);
    const accuracy = mine.length ? mine.reduce((s, a) => s + Math.max(0, 100 - (a.winBefore - a.winAfter) * 2), 0) / mine.length : null;
    updateProgress((p) => ({ ...p, games: [{ date: new Date().toISOString(), result, pgn: pg.pgn(), level, accuracy }, ...p.games].slice(0, 50) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const onMove = ({ from, to, promotion }: { from: string; to: string; promotion?: string }) => {
    if (!atLive || !myTurn || aiThinking) return false;
    const c = new Chess(current);
    let m;
    try {
      m = c.move({ from, to, promotion });
    } catch {
      return false;
    }
    const uci = m.from + m.to + (m.promotion ?? "");
    const fenBefore = current;
    const idx = plies.length;
    setHint(null);
    playUci(uci, plies);
    setPending(idx);
    const id = gameId.current;
    assessMove(fenBefore, uci, { depth: 12, level: coachLevel })
      .then((a) => {
        if (id !== gameId.current) return;
        setAssess((s) => ({ ...s, [idx]: a }));
        updateProgress((p) => ({ ...p, qualityCounts: { ...p.qualityCounts, [a.quality]: (p.qualityCounts[a.quality] || 0) + 1 } }));
      })
      .finally(() => setPending((p) => (p === idx ? null : p)));
    return true;
  };

  const reset = (asColor = color) => {
    gameId.current++;
    setPlies([]);
    setView(0);
    setAssess({});
    setPreview(null);
    setHint(null);
    setAiThinking(false);
    setColor(asColor);
  };

  const undo = () => {
    gameId.current++;
    setAiThinking(false);
    setPreview(null);
    let n = plies.length - 1;
    if (mode === "ai") {
      // back to the last position where it's the player's turn
      while (n > 0 && new Chess(fenAt(n)).turn() !== color[0]) n--;
      if (n < 0) n = 0;
    }
    n = Math.max(0, n);
    setPlies(plies.slice(0, n));
    setView(n);
    setAssess((s) => Object.fromEntries(Object.entries(s).filter(([k]) => Number(k) < n)));
  };

  const askHint = async () => {
    const a = await getEngine().analyse(current, { depth: 12, multipv: 3 });
    if (a.lines[0]) setHint({ from: a.lines[0].uci.slice(0, 2), to: a.lines[0].uci.slice(2, 4) });
  };

  // most recent assessment of the player's move up to the viewed ply
  const shownAssessIdx = useMemo(() => {
    for (let i = view - 1; i >= 0; i--) if (assess[i] || pending === i) return i;
    return -1;
  }, [view, assess, pending]);
  const shownAssess = shownAssessIdx >= 0 ? assess[shownAssessIdx] ?? null : null;

  const showLine = (kind: "best" | "reply") => {
    if (!shownAssess) return;
    const src = kind === "best" ? shownAssess.best : shownAssess.reply;
    if (!src) return;
    const base = kind === "best" ? shownAssess.fenBefore : shownAssess.fenAfter;
    const v = pvToFens(base, src.pv, 8);
    setPreview({ ...v, idx: 1, label: kind === "best" ? `Better move: ${src.san}` : `Opponent's idea: ${src.san}` });
  };

  const last = preview
    ? preview.idx > 0 ? { from: preview.ucis[preview.idx - 1].slice(0, 2), to: preview.ucis[preview.idx - 1].slice(2, 4) } : null
    : view > 0 ? { from: plies[view - 1].from, to: plies[view - 1].to } : null;

  const evalShown = shownAssess?.evalAfter ?? { cp: 0, mate: null };
  const status = game.isCheckmate()
    ? `Checkmate — ${game.turn() === "w" ? "Black" : "White"} wins`
    : game.isStalemate() ? "Stalemate — draw" : game.isDraw() ? "Draw" : aiThinking ? "Computer is thinking…" : `${game.turn() === "w" ? "White" : "Black"} to move${game.inCheck() ? " — check!" : ""}`;

  const pairs: { n: number; w?: Ply; b?: Ply; wi: number; bi: number }[] = [];
  for (let i = 0; i < plies.length; i += 2) pairs.push({ n: i / 2 + 1, w: plies[i], b: plies[i + 1], wi: i, bi: i + 1 });

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-lg">{preview ? preview.label : status}</p>
          {preview && (
            <div className="flex gap-1 text-sm">
              <button className="rounded border border-border px-2 py-1" disabled={preview.idx === 0} onClick={() => setPreview({ ...preview, idx: preview.idx - 1 })}>◀</button>
              <span className="px-2 py-1 font-mono">{preview.sans.slice(0, preview.idx).join(" ") || "start"}</span>
              <button className="rounded border border-border px-2 py-1" disabled={preview.idx >= preview.fens.length - 1} onClick={() => setPreview({ ...preview, idx: preview.idx + 1 })}>▶</button>
              <button className="ml-2 rounded bg-primary px-3 py-1 text-primary-foreground" onClick={() => setPreview(null)}>Back to my game</button>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <EvalBar cp={evalShown.cp} mate={evalShown.mate} orientation={color} />
          <div className="flex-1">
            <Board
              fen={shownFen}
              orientation={color}
              interactive={atLive && myTurn && !game.isGameOver()}
              onMove={onMove}
              lastMove={last}
              arrows={hint && atLive ? [hint] : []}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <button className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={() => setView(0)}>⏮</button>
          <button className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={() => setView((v) => Math.max(0, v - 1))}>◀</button>
          <button className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={() => setView((v) => Math.min(plies.length, v + 1))}>▶</button>
          <button className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={() => setView(plies.length)}>⏭</button>
          <span className="mx-2 w-px bg-border" />
          <button className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={undo} disabled={!plies.length}>Undo</button>
          <button className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={askHint} disabled={!atLive || !myTurn}>Hint</button>
          <button className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={() => setColor((c) => (c === "white" ? "black" : "white"))}>Flip</button>
          <button className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90" onClick={() => reset()}>New game</button>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="card-paper space-y-3 p-4 text-sm">
          <div className="flex gap-1 rounded-md bg-muted p-1">
            {(["ai", "free"] as const).map((m) => (
              <button key={m} className={`flex-1 rounded px-2 py-1 ${mode === m ? "bg-card font-semibold shadow-sm" : "text-muted-foreground"}`} onClick={() => { setMode(m); reset(); }}>
                {m === "ai" ? "vs Computer" : "Free play / analysis"}
              </button>
            ))}
          </div>
          {mode === "ai" && (
            <>
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Opponent</span>
                <select className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5" value={level} onChange={(e) => setLevel(e.target.value as Difficulty)}>
                  {Object.entries(DIFFICULTIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <span className="mt-1 block text-xs text-muted-foreground">{DIFFICULTIES[level].blurb}</span>
              </label>
              <div className="flex gap-2">
                <button className={`flex-1 rounded-md border px-2 py-1 ${color === "white" ? "border-primary bg-secondary font-semibold" : "border-border"}`} onClick={() => reset("white")}>Play White</button>
                <button className={`flex-1 rounded-md border px-2 py-1 ${color === "black" ? "border-primary bg-secondary font-semibold" : "border-border"}`} onClick={() => reset("black")}>Play Black</button>
              </div>
            </>
          )}
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Coach explains for</span>
            <select className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5" value={coachLevel} onChange={(e) => setCoachLevel(e.target.value as CoachLevel)}>
              <option value="beginner">Beginners</option>
              <option value="intermediate">Intermediate players</option>
              <option value="advanced">Advanced players</option>
            </select>
          </label>
        </div>

        <CoachCard
          key={shownAssessIdx + coachLevel}
          a={shownAssess}
          loading={pending !== null && shownAssessIdx === pending}
          onShowLine={showLine}
          defaultSimple={coachLevel === "beginner"}
        />

        <div className="card-paper max-h-64 overflow-auto p-4">
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Moves</p>
          {!plies.length && <p className="text-sm text-muted-foreground">No moves yet.</p>}
          <ol className="grid grid-cols-[2rem_1fr_1fr] gap-y-1 font-mono text-sm">
            {pairs.map((p) => (
              <li key={p.n} className="contents">
                <span className="text-muted-foreground">{p.n}.</span>
                {[{ ply: p.w, i: p.wi }, { ply: p.b, i: p.bi }].map(({ ply, i }) =>
                  ply ? (
                    <button key={i} onClick={() => { setPreview(null); setView(i + 1); }} className={`rounded px-1 text-left hover:bg-secondary ${view === i + 1 ? "bg-secondary font-bold" : ""}`}>
                      {ply.san}
                      {assess[i] && <span className={`ml-1 ${QUALITY_META[assess[i].quality].tone}`}>{QUALITY_META[assess[i].quality].symbol}</span>}
                    </button>
                  ) : <span key={i} />,
                )}
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </main>
  );
}
