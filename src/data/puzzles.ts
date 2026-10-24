import { Chess } from "chess.js";
import { MASTER_GAMES, sanList } from "./masters";

export type Puzzle = {
  id: string;
  title: string;
  theme: string;
  level: "beginner" | "casual" | "intermediate" | "advanced";
  fen: string;
  solution: string[]; // UCI; even indexes = solver, odd = scripted reply
  prompt: string;
  explanation: string;
};

function fenAfterSans(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}
function fromGame(id: string, ply: number) {
  const g = MASTER_GAMES.find((x) => x.id === id)!;
  return fenAfterSans(sanList(g).slice(0, ply));
}

export const PUZZLES: Puzzle[] = [
  {
    id: "back-rank",
    title: "The Back Rank",
    theme: "Back-rank mate",
    level: "beginner",
    fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
    solution: ["d1d8"],
    prompt: "White to move. Checkmate in one.",
    explanation: "Black's own pawns trap the king on the back rank. The rook delivers mate along the 8th rank.",
  },
  {
    id: "scholars-mate",
    title: "Scholar's Mate",
    theme: "Attack on f7",
    level: "beginner",
    fen: fenAfterSans(["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6"]),
    solution: ["h5f7"],
    prompt: "White to move. Black just defended the wrong way — punish it.",
    explanation: "f7 is defended only by the king. Queen and bishop together attack it: Qxf7 is checkmate.",
  },
  {
    id: "smothered",
    title: "Smothered",
    theme: "Smothered mate",
    level: "casual",
    fen: "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1",
    solution: ["g5f7"],
    prompt: "White to move. The black king is surrounded by its own pieces.",
    explanation: "The king has no free squares. A knight check can't be blocked — Nf7 is a smothered mate.",
  },
  {
    id: "royal-fork",
    title: "Royal Fork",
    theme: "Knight fork",
    level: "casual",
    fen: "3q3k/6pp/8/4N3/8/8/6PP/6K1 w - - 0 1",
    solution: ["e5f7", "h8g8", "f7d8"],
    prompt: "White to move and win the queen.",
    explanation: "Nf7+ attacks the king and queen at the same time. After the king moves, the knight captures the queen.",
  },
  {
    id: "skewer",
    title: "Through the King",
    theme: "Skewer",
    level: "intermediate",
    fen: "6q1/8/8/3k4/8/8/8/1B2K3 w - - 0 1",
    solution: ["b1a2"],
    prompt: "White to move. Find the move that will win the queen.",
    explanation: "Ba2+ checks the king along the diagonal. Once the king steps aside, the bishop captures the queen behind it — a skewer.",
  },
  {
    id: "opera-finish",
    title: "Morphy's Finish",
    theme: "Deflection & mate",
    level: "intermediate",
    fen: fromGame("opera-game", 30),
    solution: ["b3b8", "d7b8", "d1d8"],
    prompt: "Morphy vs. Duke & Count, Paris 1858. White to move and mate in two.",
    explanation: "Qb8+!! forces Nxb8, deflecting the knight from d7. That opens d8 for Rd8#.",
  },
  {
    id: "immortal-finish",
    title: "The Immortal Finish",
    theme: "Queen sacrifice",
    level: "advanced",
    fen: fromGame("immortal-game", 42),
    solution: ["f3f6", "g8f6", "d6e7"],
    prompt: "Anderssen vs. Kieseritzky, London 1851. White to move and mate in two.",
    explanation: "Qf6+!! deflects the knight from g8. Then Be7# — the bishop mates, covered by the knights on d5 and g7.",
  },
];
