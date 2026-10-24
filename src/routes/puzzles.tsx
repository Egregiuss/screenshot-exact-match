import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "@/components/chess/Board";
import { CoachCard } from "@/components/chess/CoachCard";
import { PUZZLES } from "@/data/puzzles";
import { assessMove, uciToMove, type Assessment } from "@/lib/coach";
import { updateProgress, useProgress } from "@/lib/progress";

export const Route = createFileRoute("/puzzles")({
  head: () => ({
    meta: [
      { title: "Chess Puzzles — Gambit Coach" },
      { name: "description", content: "Solve tactical chess puzzles — mates, forks, skewers and famous master finishes." },
      { property: "og:title", content: "Chess Puzzles — Gambit Coach" },
      { property: "og:description", content: "Sharpen your tactics with guided chess puzzles." },
    ],
  }),
  component: PuzzlesPage,
});

function PuzzlesPage() {
  const progress = useProgress();
  const [i, setI] = useState(0);
  const p = PUZZLES[i];
  const [fen, setFen] = useState(p.fen);
  const [step, setStep] = useState(0);
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [msg, setMsg] = useState<"" | "wrong" | "solved">("");
  const [hint, setHint] = useState(0);
  const [why, setWhy] = useState<Assessment | null>(null);
  const [whyLoading, setWhyLoading] = useState(false);
  const [wrongMove, setWrongMove] = useState<{ fen: string; uci: string } | null>(null);
  const orientation = new Chess(p.fen).turn() === "w" ? "white" : "black";

  useEffect(() => {
    setFen(p.fen); setStep(0); setLast(null); setMsg(""); setHint(0); setWhy(null); setWrongMove(null);
  }, [p]);

  const onMove = ({ from, to, promotion }: { from: string; to: string; promotion?: string }) => {
    if (msg === "solved") return false;
    const c = new Chess(fen);
    let m;
    try { m = c.move({ from, to, promotion }); } catch { return false; }
    const uci = m.from + m.to + (m.promotion ?? "");
    const expected = p.solution[step];
    const isLast = step === p.solution.length - 1;
    const ok = uci === expected || (isLast && c.isCheckmate());
    if (!ok) {
      setMsg("wrong");
      setWhy(null);
      setWrongMove({ fen, uci });
      return false;
    }
    setFen(c.fen()); setLast({ from: m.from, to: m.to }); setMsg(""); setWrongMove(null);
    if (step + 1 >= p.solution.length) {
      setMsg("solved");
      updateProgress((pr) => ({ ...pr, puzzles: [...new Set([...pr.puzzles, p.id])] }));
      return true;
    }
    const reply = p.solution[step + 1];
    setTimeout(() => {
      const r = c.move(uciToMove(reply));
      setFen(c.fen()); setLast({ from: r.from, to: r.to });
      setStep(step + 2);
    }, 500);
    return true;
  };

  const explainWrong = async () => {
    if (!wrongMove) return;
    setWhyLoading(true);
    try { setWhy(await assessMove(wrongMove.fen, wrongMove.uci, { depth: 12 })); } finally { setWhyLoading(false); }
  };

  const hintSquare = p.solution[step]?.slice(0, 2);

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_400px]">
      <div>
        <Board fen={fen} orientation={orientation} onMove={onMove} lastMove={last} interactive={msg !== "solved"}
          highlight={hint >= 1 && hintSquare ? [hintSquare] : []}
          arrows={hint >= 2 && p.solution[step] ? [{ from: p.solution[step].slice(0, 2), to: p.solution[step].slice(2, 4) }] : []} />
      </div>
      <aside className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{p.theme} · {p.level}</p>
          <h1 className="text-3xl">{p.title}</h1>
          <p className="mt-2">{p.prompt}</p>
        </div>
        <div className="card-paper p-5 text-sm">
          {msg === "solved" ? (
            <>
              <p className="font-display text-xl text-q-best">Solved!</p>
              <p className="mt-2 leading-relaxed">{p.explanation}</p>
            </>
          ) : msg === "wrong" ? (
            <>
              <p className="font-semibold text-q-mistake">That's not the solution.</p>
              <p className="mt-1 text-muted-foreground">Look for checks, captures and threats first.</p>
              <button className="mt-3 rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={explainWrong}>Why doesn't my move work?</button>
            </>
          ) : (
            <p className="text-muted-foreground">Make your move on the board. Think before you click: what is the most forcing move?</p>
          )}
          {msg !== "solved" && (
            <div className="mt-3 flex gap-2">
              <button className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={() => setHint((h) => Math.min(2, h + 1))}>
                {hint === 0 ? "Hint: which piece?" : "Show the move"}
              </button>
            </div>
          )}
        </div>
        {(why || whyLoading) && <CoachCard a={why} loading={whyLoading} label="Your try" defaultSimple />}
        <div className="card-paper p-4">
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">All puzzles · {progress.puzzles.length}/{PUZZLES.length} solved</p>
          <div className="grid gap-1">
            {PUZZLES.map((q, k) => (
              <button key={q.id} onClick={() => setI(k)} className={`flex justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-secondary ${k === i ? "bg-secondary font-semibold" : ""}`}>
                <span>{q.title}</span>
                <span className="text-muted-foreground">{progress.puzzles.includes(q.id) ? "✓" : q.level}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}
