// Browser-side Stockfish (lite, single-threaded WASM) speaking UCI over a Web Worker.
// All jobs are serialized; results are cached by FEN + settings.

export type EngineLine = {
  uci: string;
  cp: number | null; // side-to-move perspective
  mate: number | null; // side-to-move perspective
  pv: string[];
  depth: number;
};
export type Analysis = { fen: string; lines: EngineLine[]; depth: number };

export type Difficulty = "beginner" | "casual" | "intermediate" | "advanced" | "expert";

export const DIFFICULTIES: Record<
  Difficulty,
  { label: string; skill: number; depth: number; blurb: string }
> = {
  beginner: { label: "Beginner", skill: 0, depth: 1, blurb: "Makes frequent mistakes and often leaves pieces hanging. Great for your first games." },
  casual: { label: "Casual", skill: 4, depth: 3, blurb: "Knows the basics but misses tactics. Punishes obvious blunders sometimes." },
  intermediate: { label: "Intermediate", skill: 9, depth: 6, blurb: "Sees simple tactics and develops sensibly. Expect a real fight." },
  advanced: { label: "Advanced", skill: 15, depth: 10, blurb: "Rarely blunders and spots most combinations. A tough club-level opponent." },
  expert: { label: "Expert", skill: 20, depth: 14, blurb: "Plays close to full strength. Every inaccuracy can be punished." },
};

type Job = {
  commands: string[];
  onLine: (line: string) => boolean; // return true when finished
  timeoutMs: number;
};

class StockfishEngine {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private handler: ((line: string) => void) | null = null;
  private cache = new Map<string, Analysis>();

  private boot(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = new Promise<void>((resolve, reject) => {
      try {
        this.worker = new Worker("/engine/stockfish-19-lite-single.js");
      } catch (e) {
        reject(e);
        return;
      }
      this.worker.onmessage = (ev: MessageEvent) => {
        const line = typeof ev.data === "string" ? ev.data : String(ev.data);
        this.handler?.(line);
      };
      this.worker.onerror = () => {
        // Engine crashed: allow a fresh boot on the next request.
        this.ready = null;
        this.worker = null;
      };
      this.handler = (line) => {
        if (line === "uciok") this.worker!.postMessage("isready");
        if (line === "readyok") {
          this.handler = null;
          resolve();
        }
      };
      this.worker.postMessage("uci");
    });
    return this.ready;
  }

  private run(job: Job): Promise<void> {
    const task = async () => {
      await this.boot();
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          this.worker?.postMessage("stop");
        }, job.timeoutMs);
        this.handler = (line) => {
          if (job.onLine(line)) {
            clearTimeout(timer);
            this.handler = null;
            resolve();
          }
        };
        for (const c of job.commands) this.worker!.postMessage(c);
      });
    };
    const p = this.chain.then(task, task);
    this.chain = p.catch(() => undefined);
    return p;
  }

  async analyse(fen: string, opts: { depth?: number; multipv?: number } = {}): Promise<Analysis> {
    const depth = opts.depth ?? 12;
    const multipv = opts.multipv ?? 3;
    const key = `${fen}|${depth}|${multipv}`;
    const hit = this.cache.get(key);
    if (hit) return hit;

    const lines = new Map<number, EngineLine>();
    let maxDepth = 0;
    await this.run({
      commands: [
        "setoption name Skill Level value 20",
        `setoption name MultiPV value ${multipv}`,
        `position fen ${fen}`,
        `go depth ${depth}`,
      ],
      timeoutMs: 12000,
      onLine: (line) => {
        if (line.startsWith("info") && line.includes(" pv ")) {
          const parsed = parseInfo(line);
          if (parsed) {
            lines.set(parsed.multipv, parsed.line);
            maxDepth = Math.max(maxDepth, parsed.line.depth);
          }
        }
        return line.startsWith("bestmove");
      },
    });
    const result: Analysis = {
      fen,
      depth: maxDepth,
      lines: [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => l),
    };
    this.cache.set(key, result);
    return result;
  }

  async bestMove(fen: string, level: Difficulty): Promise<string | null> {
    const cfg = DIFFICULTIES[level];
    let best: string | null = null;
    await this.run({
      commands: [
        `setoption name Skill Level value ${cfg.skill}`,
        "setoption name MultiPV value 1",
        `position fen ${fen}`,
        `go depth ${cfg.depth}`,
      ],
      timeoutMs: 8000,
      onLine: (line) => {
        if (line.startsWith("bestmove")) {
          const m = line.split(" ")[1];
          best = m && m !== "(none)" ? m : null;
          return true;
        }
        return false;
      },
    });
    return best;
  }
}

export function parseInfo(line: string): { multipv: number; line: EngineLine } | null {
  const t = line.split(" ");
  const get = (k: string) => {
    const i = t.indexOf(k);
    return i >= 0 ? t[i + 1] : undefined;
  };
  const pvIdx = t.indexOf("pv");
  if (pvIdx < 0) return null;
  const scoreIdx = t.indexOf("score");
  if (scoreIdx < 0) return null;
  const kind = t[scoreIdx + 1];
  const val = Number(t[scoreIdx + 2]);
  const pv = t.slice(pvIdx + 1).filter(Boolean);
  return {
    multipv: Number(get("multipv") ?? 1),
    line: {
      uci: pv[0],
      cp: kind === "cp" ? val : null,
      mate: kind === "mate" ? val : null,
      pv,
      depth: Number(get("depth") ?? 0),
    },
  };
}

let instance: StockfishEngine | null = null;
export function getEngine(): StockfishEngine {
  if (typeof window === "undefined") throw new Error("Engine is browser-only");
  if (!instance) instance = new StockfishEngine();
  return instance;
}
