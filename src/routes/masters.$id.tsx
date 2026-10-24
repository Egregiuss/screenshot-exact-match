import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Board, type BoardArrow } from "@/components/chess/Board";
import { CoachCard } from "@/components/chess/CoachCard";
import { MASTER_GAMES, sanList } from "@/data/masters";
import { assessMove, pvToSan, type Assessment } from "@/lib/coach";
import { getEngine } from "@/lib/engine";

export const Route = createFileRoute("/masters/$id")({
  loader: ({ params }) => {
    const game = MASTER_GAMES.find((g) => g.id === params.id);
    if (!game) throw notFound();
    return { game };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.game.nickname ?? "Master game"} — Gambit Coach` },
      { name: "description", content: loaderData ? `${loaderData.game.white} vs ${loaderData.game.black}, ${loaderData.game.year}. ${loaderData.game.context}` : "Master game replay" },
      { property: "og:title", content: `${loaderData?.game.nickname ?? "Master game"} — Gambit Coach` },
      { property: "og:description", content: loaderData?.game.context ?? "Master game replay" },
    ],
  }),
  component: MasterGamePage,
});

function MasterGamePage() {
  const { game } = Route.useLoaderData();
  const sans = useMemo(() => sanList(game), [game]);
  const timeline = useMemo(() => {
    const c = new Chess();
    const out = [{ fen: c.fen(), from: "", to: "" }];
    for (const s of sans) {
      const m = c.move(s);
      out.push({ fen: c.fen(), from: m.from, to: m.to });
    }
    return out;
  }, [sans]);
  const [ply, setPly] = useState(0);
  const [tryMode, setTryMode] = useState(false);
  const [mine, setMine] = useState<Assessment | null>(null);
  const [hist, setHist] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMine(null); setHist(null); }, [ply]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setPly((p) => Math.min(sans.length, p + 1));
      if (e.key === "ArrowLeft") setPly((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [sans.length]);

  const fen = timeline[ply].fen;
  const nextSan = sans[ply];
  const note = game.notes[ply];

  const onMove = ({ from, to, promotion }: { from: string; to: string; promotion?: string }) => {
    if (!tryMode || ply >= sans.length) return false;
    const c = new Chess(fen);
    let m;
    try { m = c.move({ from, to, promotion }); } catch { return false; }
    const uci = m.from + m.to + (m.promotion ?? "");
    const h = new Chess(fen).move(nextSan);
    const huci = h.from + h.to + (h.promotion ?? "");
    setLoading(true);
    (async () => {
      const a = await assessMove(fen, uci, { depth: 13 });
      const b = uci === huci ? a : await assessMove(fen, huci, { depth: 13 });
      setMine(a); setHist(b); setLoading(false);
    })();
    return false;
  };

  const [engineBest, setEngineBest] = useState<string | null>(null);
  useEffect(() => {
    setEngineBest(null);
    if (!tryMode || ply >= sans.length) return;
    getEngine().analyse(fen, { depth: 13, multipv: 1 }).then((a) => {
      if (a.lines[0]) setEngineBest(pvToSan(fen, [a.lines[0].uci], 1)[0]);
    });
  }, [fen, tryMode, ply, sans.length]);

  const arrows: BoardArrow[] = [];
  if (mine) arrows.push({ from: mine.uci.slice(0, 2), to: mine.uci.slice(2, 4), kind: "alt" });
  if (hist && hist.uci !== mine?.uci) arrows.push({ from: hist.uci.slice(0, 2), to: hist.uci.slice(2, 4) });

  const moveLabel = (i: number) => `${Math.floor(i / 2) + 1}${i % 2 === 0 ? "." : "…"} ${sans[i]}`;
  const orientation = game.result === "0-1" ? "black" : "white";

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_400px]">
      <section>
        <Board fen={fen} orientation={orientation} interactive={tryMode && ply < sans.length} onMove={onMove}
          lastMove={ply > 0 && !mine ? { from: timeline[ply].from, to: timeline[ply].to } : null} arrows={arrows} />
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <button className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={() => setPly(0)}>⏮</button>
          <button className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={() => setPly((p) => Math.max(0, p - 1))}>◀ Back</button>
          <button className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground" onClick={() => setPly((p) => Math.min(sans.length, p + 1))}>Next ▶</button>
          <button className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={() => setPly(sans.length)}>⏭</button>
          <label className="ml-auto flex items-center gap-2">
            <input type="checkbox" checked={tryMode} onChange={(e) => setTryMode(e.target.checked)} />
            Pause & try your own move
          </label>
        </div>
      </section>
      <aside className="space-y-4">
        <Link to="/masters" className="text-sm text-muted-foreground hover:text-foreground">← All games</Link>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{game.event} · {game.site} {game.year}</p>
          <h1 className="text-3xl">{game.nickname}</h1>
          <p className="mt-1 text-sm">{game.white} – {game.black} <span className="font-mono">{game.result}</span> · {game.opening} ({game.eco})</p>
        </div>
        <div className="card-paper p-5 text-sm leading-relaxed">
          {ply === 0 ? <p>{game.context}</p> : (
            <>
              <p className="font-mono text-xs text-muted-foreground">{moveLabel(ply - 1)}</p>
              <p className="mt-1">{note ?? "Keep stepping through — notes appear at the critical moments."}</p>
            </>
          )}
          {tryMode && ply < sans.length && !mine && !loading && (
            <p className="mt-3 rounded-md bg-secondary p-2">
              Your turn: what would you play for {new Chess(fen).turn() === "w" ? "White" : "Black"} here? Make a move on the board.
            </p>
          )}
        </div>
        {tryMode && (loading || mine) && (
          <>
            <CoachCard a={mine} loading={loading} label="You suggested" />
            {hist && mine && (
              <div className="card-paper p-4 text-sm">
                <p><span className="font-semibold">In the game:</span> <span className="font-mono">{moveLabel(ply)}</span> — rated <em>{hist.quality.replace("-", " ")}</em> by the engine.</p>
                {engineBest && <p className="mt-1"><span className="font-semibold">Engine's choice:</span> <span className="font-mono">{engineBest}</span></p>}
                <p className="mt-2 text-muted-foreground">A historical move isn't always the engine's top pick — players also weigh practical chances, time and style.</p>
                <button className="mt-2 rounded-md bg-primary px-3 py-1.5 text-primary-foreground" onClick={() => setPly((p) => p + 1)}>See what happened ▶</button>
              </div>
            )}
          </>
        )}
        <div className="card-paper max-h-56 overflow-auto p-4">
          <div className="flex flex-wrap gap-1 font-mono text-xs">
            {sans.map((s, i) => (
              <button key={i} onClick={() => setPly(i + 1)} className={`rounded px-1 py-0.5 hover:bg-secondary ${ply === i + 1 ? "bg-secondary font-bold" : ""} ${game.notes[i + 1] ? "text-primary underline decoration-brass" : ""}`}>
                {i % 2 === 0 ? `${i / 2 + 1}.` : ""}{s}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Source: {game.source}</p>
      </aside>
    </main>
  );
}
