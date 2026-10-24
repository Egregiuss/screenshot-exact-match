import { useState } from "react";
import { QUALITY_META, describeEval, type Assessment } from "@/lib/coach";

type Props = {
  a: Assessment | null;
  loading?: boolean;
  onShowLine?: (kind: "best" | "reply") => void;
  defaultSimple?: boolean;
  label?: string;
};

export function CoachCard({ a, loading, onShowLine, defaultSimple = false, label = "Your move" }: Props) {
  const [simple, setSimple] = useState(defaultSimple);
  const [deep, setDeep] = useState(false);

  if (loading && !a)
    return (
      <div className="card-paper p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Coach</p>
        <p className="mt-2 animate-pulse font-display text-lg">Thinking about your move…</p>
      </div>
    );
  if (!a)
    return (
      <div className="card-paper p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Coach</p>
        <p className="mt-2 font-display text-lg">Make a move and I'll tell you what it does.</p>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          <li>• What is your opponent threatening?</li>
          <li>• Is any of your pieces undefended?</li>
          <li>• Can you give check, capture, or create a threat?</li>
        </ul>
      </div>
    );

  const meta = QUALITY_META[a.quality];
  const ev = describeEval(a.evalAfter);
  return (
    <div className="card-paper p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}: <span className="font-mono text-foreground">{a.san}</span></p>
        <span className={`font-mono text-sm font-bold ${meta.tone}`}>{meta.symbol} {meta.label}</span>
      </div>
      <h3 className="mt-2 text-xl">{a.headline}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed">
        {(simple ? a.simple : a.why).map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
      <div className="mt-4 rounded-md border-l-4 border-brass bg-secondary px-3 py-2 text-sm">
        <span className="font-semibold">Coach's tip: </span>
        {a.tip}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {a.best && onShowLine && (
          <button className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90" onClick={() => onShowLine("best")}>
            Show better move: {a.best.san}
          </button>
        )}
        {a.reply && onShowLine && (
          <button className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={() => onShowLine("reply")}>
            Opponent's best reply: {a.reply.san}
          </button>
        )}
        <button className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={() => setSimple((s) => !s)}>
          {simple ? "Show full explanation" : "Explain like I'm new"}
        </button>
        <button className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setDeep((d) => !d)}>
          {deep ? "Hide engine details" : "Engine details"}
        </button>
      </div>
      {deep && (
        <div className="mt-3 space-y-1 rounded-md bg-muted p-3 font-mono text-xs">
          <p>Eval after move: {ev.short} — {ev.long}</p>
          <p>Your expected score: {a.winBefore.toFixed(0)}% → {a.winAfter.toFixed(0)}%</p>
          {a.best && <p>Best line: {a.best.line.join(" ")}</p>}
          {a.reply && <p>Expected reply: {a.reply.line.join(" ")}</p>}
          <p>Search depth {a.depth}{a.shallow ? " — shallow, treat with caution" : ""}. Engine evaluation is not a guaranteed result.</p>
        </div>
      )}
    </div>
  );
}
