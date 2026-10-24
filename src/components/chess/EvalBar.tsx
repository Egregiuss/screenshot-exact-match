import { describeEval, lineWin } from "@/lib/coach";

export function EvalBar({ cp, mate, orientation = "white" }: { cp: number | null; mate: number | null; orientation?: "white" | "black" }) {
  const white = lineWin({ cp, mate });
  const { short, long } = describeEval({ cp, mate });
  const pct = orientation === "white" ? white : 100 - white;
  return (
    <div className="flex w-5 flex-col overflow-hidden rounded-sm border border-border" title={long} aria-label={`Evaluation: ${long}`}>
      <div className="relative flex-1 bg-ink">
        <div
          className="absolute inset-x-0 bottom-0 bg-card transition-all duration-500"
          style={{ height: `${pct}%`, ...(orientation === "black" ? { top: 0, bottom: "auto" } : {}) }}
        />
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 rotate-0 text-center font-mono text-[9px] font-bold text-accent mix-blend-difference">
          {short}
        </span>
      </div>
    </div>
  );
}
