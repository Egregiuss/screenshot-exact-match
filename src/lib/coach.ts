import { Chess, type Color, type PieceSymbol, type Square, type Move } from "chess.js";
import { getEngine, type Analysis, type EngineLine } from "./engine";

export type Quality =
  | "brilliant"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "missed-win"
  | "forced";

export type CoachLevel = "beginner" | "intermediate" | "advanced";

export const QUALITY_META: Record<Quality, { label: string; symbol: string; tone: string }> = {
  brilliant: { label: "Brilliant", symbol: "!!", tone: "text-q-brilliant" },
  best: { label: "Best move", symbol: "★", tone: "text-q-best" },
  excellent: { label: "Excellent", symbol: "!", tone: "text-q-best" },
  good: { label: "Good", symbol: "✓", tone: "text-q-good" },
  inaccuracy: { label: "Inaccuracy", symbol: "?!", tone: "text-q-inaccuracy" },
  mistake: { label: "Mistake", symbol: "?", tone: "text-q-mistake" },
  blunder: { label: "Blunder", symbol: "??", tone: "text-q-blunder" },
  "missed-win": { label: "Missed win", symbol: "✗", tone: "text-q-mistake" },
  forced: { label: "Forced", symbol: "□", tone: "text-muted-foreground" },
};

export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const PIECE_NAME: Record<PieceSymbol, string> = {
  p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
};

/** Expected score (0-100) for the side to move, from a centipawn score. */
export function winPercent(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

export function lineWin(line: Pick<EngineLine, "cp" | "mate">): number {
  if (line.mate !== null) return line.mate > 0 ? 100 : 0;
  return winPercent(line.cp ?? 0);
}

/**
 * Classification rules (documented & configurable).
 * Uses the mover's expected score before (best play) and after the move —
 * not raw centipawn deltas — so +8 → +6 counts far less than +1 → -1.
 */
export const THRESHOLDS = { best: 2, excellent: 5, good: 10, inaccuracy: 20, mistake: 30 };

export function classify(input: {
  winBefore: number;
  winAfter: number;
  isBest: boolean;
  legalCount: number;
  isSacrifice: boolean;
}): Quality {
  const { winBefore, winAfter, isBest, legalCount, isSacrifice } = input;
  if (legalCount === 1) return "forced";
  const loss = Math.max(0, winBefore - winAfter);
  if (isBest && isSacrifice && winBefore < 90 && winAfter >= 50) return "brilliant";
  if (isBest || loss < THRESHOLDS.best) return "best";
  if (winBefore >= 85 && winAfter < 65) return "missed-win";
  if (loss < THRESHOLDS.excellent) return "excellent";
  if (loss < THRESHOLDS.good) return "good";
  if (loss < THRESHOLDS.inaccuracy) return "inaccuracy";
  if (loss < THRESHOLDS.mistake) return "mistake";
  return "blunder";
}

export function uciToMove(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined };
}

export function pvToSan(fen: string, pv: string[], max = 6): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of pv.slice(0, max)) {
    try {
      out.push(c.move(uciToMove(u)).san);
    } catch {
      break;
    }
  }
  return out;
}

export function pvToFens(fen: string, pv: string[], max = 8): { fens: string[]; sans: string[]; ucis: string[] } {
  const c = new Chess(fen);
  const fens = [fen];
  const sans: string[] = [];
  const ucis: string[] = [];
  for (const u of pv.slice(0, max)) {
    try {
      const m = c.move(uciToMove(u));
      sans.push(m.san);
      ucis.push(u);
      fens.push(c.fen());
    } catch {
      break;
    }
  }
  return { fens, sans, ucis };
}

/** White-perspective evaluation from a side-to-move line. */
export function toWhite(line: Pick<EngineLine, "cp" | "mate">, turn: Color) {
  const s = turn === "w" ? 1 : -1;
  return { cp: line.cp === null ? null : line.cp * s, mate: line.mate === null ? null : line.mate * s };
}

export function describeEval(e: { cp: number | null; mate: number | null }): { short: string; long: string } {
  if (e.mate !== null) {
    const side = e.mate > 0 ? "White" : "Black";
    return { short: `M${Math.abs(e.mate)}`, long: `${side} has a forced checkmate in ${Math.abs(e.mate)} (if they find it).` };
  }
  const cp = e.cp ?? 0;
  const p = Math.abs(cp) / 100;
  const side = cp > 0 ? "White" : "Black";
  const short = `${cp >= 0 ? "+" : "−"}${p.toFixed(1)}`;
  if (p < 0.3) return { short, long: "The position is roughly equal." };
  if (p < 1) return { short, long: `${side} is slightly better — a small edge, still all to play for.` };
  if (p < 2.5) return { short, long: `${side} has a clear advantage, about a piece's worth of pressure or a pawn or two.` };
  return { short, long: `${side} is winning on the board — but it still has to be converted.` };
}

function hangingPieces(c: Chess, color: Color): { square: Square; type: PieceSymbol }[] {
  const opp: Color = color === "w" ? "b" : "w";
  const out: { square: Square; type: PieceSymbol }[] = [];
  for (const row of c.board()) {
    for (const p of row) {
      if (!p || p.color !== color || p.type === "k") continue;
      const attackers = c.attackers(p.square, opp);
      if (!attackers.length) continue;
      const defended = c.isAttacked(p.square, color);
      const cheapest = Math.min(...attackers.map((s) => PIECE_VALUE[c.get(s)!.type] || 100));
      if (!defended || cheapest < PIECE_VALUE[p.type]) out.push({ square: p.square, type: p.type });
    }
  }
  return out;
}

function isSacrifice(after: Chess, move: Move): boolean {
  const v = PIECE_VALUE[move.piece];
  if (v < 3) return false;
  const opp: Color = move.color === "w" ? "b" : "w";
  const attackers = after.attackers(move.to, opp);
  if (!attackers.length) return false;
  const captured = move.captured ? PIECE_VALUE[move.captured] : 0;
  const defended = after.isAttacked(move.to, move.color);
  const cheapest = Math.min(...attackers.map((s) => PIECE_VALUE[after.get(s)!.type] || 100));
  const loses = !defended ? v - captured : v - captured - cheapest;
  return loses >= 2;
}

export type Assessment = {
  fenBefore: string;
  fenAfter: string;
  san: string;
  uci: string;
  mover: Color;
  quality: Quality;
  winBefore: number;
  winAfter: number;
  evalAfter: { cp: number | null; mate: number | null }; // white perspective
  depth: number;
  best?: { san: string; uci: string; line: string[]; pv: string[] };
  reply?: { san: string; uci: string; line: string[]; pv: string[] };
  headline: string;
  why: string[];
  simple: string[];
  tip: string;
  shallow: boolean;
};

const TIPS = {
  hanging: "Before every move, ask: can my opponent capture something I just left unprotected?",
  queenEarly: "Develop knights and bishops first; bring the queen out once it can't be chased around.",
  develop: "Get every minor piece into play and castle early — a fast start beats a fancy one.",
  castle: "Castling tucks your king away and connects your rooks. Do it in the first 10 moves.",
  mate: "Always look for checks, captures and threats — for both sides — before you move.",
  missed: "When you are winning, look for forcing moves first: checks, captures, threats.",
  good: "Keep asking: what does my opponent want to do next, and does my move stop it?",
  center: "Pawns and pieces in the centre control more squares and restrict your opponent.",
};

export async function assessMove(
  fenBefore: string,
  uci: string,
  opts: { depth?: number; level?: CoachLevel } = {},
): Promise<Assessment> {
  const depth = opts.depth ?? 12;
  const level = opts.level ?? "beginner";
  const engine = getEngine();
  const board = new Chess(fenBefore);
  const mover = board.turn();
  const legalCount = board.moves().length;
  const before: Analysis = await engine.analyse(fenBefore, { depth, multipv: 3 });
  const bestLine = before.lines[0];

  const after = new Chess(fenBefore);
  const move = after.move(uciToMove(uci));
  const fenAfter = after.fen();

  let winAfter: number;
  let evalAfter: { cp: number | null; mate: number | null };
  let replyLine: EngineLine | undefined;
  if (after.isCheckmate()) {
    winAfter = 100;
    evalAfter = { cp: null, mate: mover === "w" ? 1 : -1 };
  } else if (after.isDraw() || after.isStalemate()) {
    winAfter = 50;
    evalAfter = { cp: 0, mate: null };
  } else {
    const a = await engine.analyse(fenAfter, { depth, multipv: 1 });
    replyLine = a.lines[0];
    winAfter = replyLine ? 100 - lineWin(replyLine) : 50;
    evalAfter = replyLine ? toWhite(replyLine, after.turn()) : { cp: 0, mate: null };
  }

  const winBeforeRaw = bestLine ? lineWin(bestLine) : 50;
  const isBest = !!bestLine && bestLine.uci === uci;
  if (isBest) winAfter = Math.max(winAfter, winBeforeRaw - 1);
  const winBefore = Math.max(winBeforeRaw, winAfter);
  const sac = isSacrifice(after, move);
  const quality = classify({ winBefore, winAfter, isBest, legalCount, isSacrifice: sac });

  const best =
    bestLine && !isBest
      ? {
          san: pvToSan(fenBefore, [bestLine.uci], 1)[0],
          uci: bestLine.uci,
          line: pvToSan(fenBefore, bestLine.pv, 6),
          pv: bestLine.pv,
        }
      : undefined;
  const reply = replyLine
    ? {
        san: pvToSan(fenAfter, [replyLine.uci], 1)[0],
        uci: replyLine.uci,
        line: pvToSan(fenAfter, replyLine.pv, 6),
        pv: replyLine.pv,
      }
    : undefined;

  const text = explain({ board: new Chess(fenBefore), after, move, quality, best, reply, replyLine, bestLine, level });

  return {
    fenBefore, fenAfter, san: move.san, uci, mover, quality,
    winBefore, winAfter, evalAfter, depth: before.depth,
    best, reply, shallow: before.depth < 8, ...text,
  };
}

function explain(ctx: {
  board: Chess;
  after: Chess;
  move: Move;
  quality: Quality;
  best?: Assessment["best"];
  reply?: Assessment["reply"];
  replyLine?: EngineLine;
  bestLine?: EngineLine;
  level: CoachLevel;
}): { headline: string; why: string[]; simple: string[]; tip: string } {
  const { board, after, move, quality, best, reply, replyLine, bestLine } = ctx;
  const why: string[] = [];
  const simple: string[] = [];
  let tip = TIPS.good;
  const piece = PIECE_NAME[move.piece];
  const fullmove = Number(board.fen().split(" ")[5]);
  const good = ["brilliant", "best", "excellent", "good", "forced"].includes(quality);

  // Facts about the move itself
  if (after.isCheckmate()) {
    return {
      headline: "Checkmate! Game over.",
      why: [`${move.san} attacks the king and there is no legal way to escape, block or capture.`],
      simple: ["The king is attacked and has nowhere to go. You win!"],
      tip: TIPS.mate,
    };
  }
  if (move.captured) {
    why.push(`You captured a ${PIECE_NAME[move.captured]} on ${move.to} with your ${piece}.`);
    simple.push(`You took your opponent's ${PIECE_NAME[move.captured]}.`);
  }
  if (move.san.includes("+")) {
    why.push("It gives check, so your opponent must deal with the threat to their king first.");
    simple.push("You attacked the king (check) — your opponent has to respond to it.");
  }
  if (move.san.startsWith("O-O")) {
    why.push("Castling puts your king on a safer square and brings a rook toward the centre.");
    simple.push("Your king is now tucked away safely behind pawns.");
    tip = TIPS.castle;
  } else if ((move.piece === "n" || move.piece === "b") && (move.from[1] === "1" || move.from[1] === "8") && fullmove <= 12) {
    why.push(`Developing the ${piece} brings a new piece into the game.`);
    simple.push(`Good habit: you brought your ${piece} off the back row.`);
    tip = TIPS.develop;
  } else if (move.piece === "q" && fullmove <= 5) {
    why.push("Bringing the queen out this early lets your opponent develop pieces while attacking it.");
    simple.push("Your queen came out very early — it can easily be chased around.");
    tip = TIPS.queenEarly;
  } else if (move.piece === "k" && fullmove <= 15 && !move.san.startsWith("O")) {
    why.push("Moving the king by hand early usually costs you the right to castle and leaves it exposed.");
    simple.push("Kings are safest when castled — walking them around early is risky.");
    tip = TIPS.castle;
  } else if (move.piece === "p" && ["d4", "e4", "d5", "e5", "c4", "c5"].includes(move.to) && fullmove <= 6) {
    why.push("This pawn move fights for the centre and opens lines for your pieces.");
    simple.push("You put a pawn in the middle of the board — that's where the action is.");
    tip = TIPS.center;
  }

  // Threats created
  const opp = move.color === "w" ? "b" : "w";
  const targets = hangingPieces(after, opp).filter((h) => after.attackers(h.square, move.color).includes(move.to));
  if (targets.length && !after.isCheckmate()) {
    const t = targets.sort((a, b) => PIECE_VALUE[b.type] - PIECE_VALUE[a.type])[0];
    why.push(`Your ${piece} now attacks the ${PIECE_NAME[t.type]} on ${t.square}, which isn't safely protected.`);
    simple.push(`You're threatening to take their ${PIECE_NAME[t.type]}.`);
  }

  // Consequences: opponent's reply
  if (replyLine && reply) {
    const replyBoard = new Chess(after.fen());
    const rm = replyBoard.move(uciToMove(reply.uci));
    if (replyLine.mate !== null && replyLine.mate > 0) {
      why.push(`This allows a forced checkmate in ${replyLine.mate}, starting with ${reply.san}.`);
      simple.push("Danger! This lets your opponent force checkmate.");
      tip = TIPS.mate;
    } else if (rm.captured && !good) {
      why.push(`Your opponent can reply ${reply.san}, capturing your ${PIECE_NAME[rm.captured]} on ${rm.to}.`);
      simple.push(`Your ${PIECE_NAME[rm.captured]} on ${rm.to} can be taken.`);
      tip = TIPS.hanging;
    } else if (!good) {
      const hang = hangingPieces(after, move.color);
      if (hang.length) {
        const h = hang.sort((a, b) => PIECE_VALUE[b.type] - PIECE_VALUE[a.type])[0];
        why.push(`Your ${PIECE_NAME[h.type]} on ${h.square} is left under-protected.`);
        simple.push(`Watch out — your ${PIECE_NAME[h.type]} on ${h.square} isn't well defended.`);
        tip = TIPS.hanging;
      }
      why.push(`The strongest reply is ${reply.san}${rm.san.includes("+") ? ", with check" : ""}.`);
    }
  }

  if (quality === "missed-win") {
    why.push("You had a winning continuation and this move lets much of that advantage slip.");
    simple.push("You were winning here — there was a much stronger move.");
    tip = TIPS.missed;
  }

  // Better move
  if (best && !good) {
    const bb = new Chess(board.fen());
    const bm = bb.move(uciToMove(best.uci));
    let idea = "";
    if (bestLine?.mate !== null && bestLine?.mate !== undefined && bestLine.mate > 0) idea = `it forces checkmate in ${bestLine.mate}`;
    else if (bm.captured) idea = `it wins a ${PIECE_NAME[bm.captured]}`;
    else if (bm.san.includes("+")) idea = "it gives check and keeps the initiative";
    else if (bm.san.startsWith("O-O")) idea = "it gets your king safe";
    else if ((bm.piece === "n" || bm.piece === "b") && (bm.from[1] === "1" || bm.from[1] === "8")) idea = `it develops your ${PIECE_NAME[bm.piece]}`;
    else idea = "it keeps your position solid and your pieces safe";
    why.push(`A stronger move was ${best.san} — ${idea}.`);
    simple.push(`Try ${best.san} instead: ${idea}.`);
  }

  if (!why.length) {
    why.push(good ? "A solid, sensible move that keeps the balance of the position." : "This move gives your opponent a better position than necessary.");
    simple.push(good ? "Nice — a sensible move." : "There was a better option here.");
  }

  const headlines: Record<Quality, string> = {
    brilliant: "A brilliant sacrifice!",
    best: "That's the best move.",
    excellent: "Excellent move.",
    good: "Good move.",
    inaccuracy: "Playable, but not the most accurate.",
    mistake: "That's a mistake.",
    blunder: "Ouch — that's a blunder.",
    "missed-win": "You missed a winning chance.",
    forced: "The only legal move.",
  };
  return { headline: headlines[quality], why, simple, tip };
}
