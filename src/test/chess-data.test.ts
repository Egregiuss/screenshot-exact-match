import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { MASTER_GAMES, sanList } from "@/data/masters";
import { PUZZLES } from "@/data/puzzles";
import { LESSONS } from "@/data/lessons";
import { classify } from "@/lib/coach";

describe("master games", () => {
  for (const g of MASTER_GAMES) {
    it(`${g.nickname} is a legal game ending as recorded`, () => {
      const c = new Chess();
      for (const s of sanList(g)) c.move(s);
      if (g.moves.trim().endsWith("#")) expect(c.isCheckmate()).toBe(true);
      for (const ply of Object.keys(g.notes).map(Number)) expect(ply).toBeLessThanOrEqual(sanList(g).length);
    });
  }
});

describe("puzzles", () => {
  for (const p of PUZZLES) {
    it(`${p.title} solution is legal`, () => {
      const c = new Chess(p.fen);
      for (const u of p.solution) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (/mate/i.test(p.prompt + p.theme)) expect(c.isCheckmate()).toBe(true);
    });
  }
});

describe("lessons", () => {
  for (const l of LESSONS) {
    it(`${l.title} has a reachable goal at every step`, () => {
      let c = new Chess();
      for (const s of l.steps) {
        if (s.fen) c = new Chess(s.fen);
        const moves = c.moves({ verbose: true });
        const ok = moves.filter((m) => {
          const t = new Chess(c.fen());
          t.move(m.san);
          if (s.goal.kind === "san") return s.goal.accept.includes(m.san);
          if (s.goal.kind === "check") return t.inCheck();
          return t.isCheckmate();
        });
        expect(ok.length).toBeGreaterThan(0);
        c.move(ok[0].san);
        if (s.replies) {
          const r = s.replies.find((x) => c.moves().includes(x));
          expect(r).toBeDefined();
          c.move(r!);
        }
      }
    });
  }
});

describe("move classification", () => {
  const base = { isBest: false, legalCount: 20, isSacrifice: false };
  it("only legal move is forced", () => expect(classify({ ...base, winBefore: 50, winAfter: 10, legalCount: 1 })).toBe("forced"));
  it("engine's top move is best", () => expect(classify({ ...base, winBefore: 60, winAfter: 59, isBest: true })).toBe("best"));
  it("losing 35% expected score is a blunder", () => expect(classify({ ...base, winBefore: 55, winAfter: 20 })).toBe("blunder"));
  it("losing 25% is a mistake", () => expect(classify({ ...base, winBefore: 55, winAfter: 30 })).toBe("mistake"));
  it("losing 15% is an inaccuracy", () => expect(classify({ ...base, winBefore: 55, winAfter: 40 })).toBe("inaccuracy"));
  it("throwing away a winning position is a missed win", () => expect(classify({ ...base, winBefore: 92, winAfter: 55 })).toBe("missed-win"));
  it("a sound sacrifice from equality is brilliant", () => expect(classify({ ...base, winBefore: 55, winAfter: 70, isBest: true, isSacrifice: true })).toBe("brilliant"));
  it("a sacrifice in an already crushing position is not brilliant", () => expect(classify({ ...base, winBefore: 97, winAfter: 98, isBest: true, isSacrifice: true })).toBe("best"));
});
