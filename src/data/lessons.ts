export type LessonGoal =
  | { kind: "san"; accept: string[] }
  | { kind: "check" }
  | { kind: "mate" };

export type LessonStep = {
  fen?: string; // omitted = continue from previous position
  text: string;
  goal: LessonGoal;
  hint: string;
  explain: string;
  replies?: string[]; // first legal one is played after a correct move
};

export type Lesson = {
  id: string;
  module: number;
  title: string;
  objective: string;
  level: "beginner" | "casual" | "intermediate";
  concepts: string[];
  intro: string;
  steps: LessonStep[];
};

export const MODULES: Record<number, string> = {
  1: "Learn the Board",
  2: "Understand the Rules",
  3: "Win Your First Games",
  4: "Spot Tactics",
};

export const LESSONS: Lesson[] = [
  {
    id: "rook-bishop",
    module: 1,
    title: "Straight lines & diagonals",
    objective: "Move the rook and bishop correctly.",
    level: "beginner",
    concepts: ["Rook", "Bishop", "Coordinates"],
    intro: "Every square has a name: a letter for the column (a–h) and a number for the row (1–8). Rooks slide in straight lines; bishops slide diagonally.",
    steps: [
      { fen: "7k/8/8/8/8/8/8/R3K3 w - - 0 1", text: "Move the rook from a1 up to a5.", goal: { kind: "san", accept: ["Ra5"] }, hint: "Click the rook on a1, then click a5 — straight up the a-file.", explain: "Rooks move any number of squares up, down, left or right — as long as nothing is in the way." },
      { fen: "7k/8/8/8/8/8/8/2B1K3 w - - 0 1", text: "Slide the bishop all the way to h6.", goal: { kind: "san", accept: ["Bh6"] }, hint: "Follow the diagonal c1 → d2 → e3 → f4 → g5 → h6.", explain: "Bishops move diagonally and always stay on the same colour square." },
    ],
  },
  {
    id: "knight-capture",
    module: 1,
    title: "Knights & captures",
    objective: "Jump with the knight and capture an enemy piece.",
    level: "beginner",
    concepts: ["Knight", "Capturing"],
    intro: "The knight moves in an L-shape: two squares one way, then one square sideways. It is the only piece that can jump over others.",
    steps: [
      { fen: "7k/8/8/8/8/8/PPP5/1N2K3 w - - 0 1", text: "Jump the knight from b1 to c3 — right over the pawns.", goal: { kind: "san", accept: ["Nc3"] }, hint: "Two squares up and one to the right.", explain: "Knights jump, so pieces in between never block them." },
      { fen: "7k/8/8/3r4/8/8/3Q4/4K3 w - - 0 1", text: "Capture the black rook with your queen.", goal: { kind: "san", accept: ["Qxd5"] }, hint: "The queen moves like a rook and bishop combined. The rook is straight up the d-file.", explain: "You capture by moving onto the enemy piece's square. A rook is worth about 5 pawns — a great trade for nothing!" },
    ],
  },
  {
    id: "check-mate",
    module: 2,
    title: "Check and checkmate",
    objective: "Give check, then deliver checkmate.",
    level: "beginner",
    concepts: ["Check", "Checkmate", "Stalemate"],
    intro: "Check means the king is attacked. Checkmate means it is attacked and cannot escape — that wins the game. If a player has no legal move but is NOT in check, it's stalemate: a draw.",
    steps: [
      { fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1", text: "Give check to the black king.", goal: { kind: "check" }, hint: "The king is on e8. Can your rook reach the 8th row?", explain: "Ra8+ attacks the king along the back row. Black must move the king out of danger." },
      { fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", text: "Now deliver checkmate in one move.", goal: { kind: "mate" }, hint: "The black pawns block their own king's escape squares.", explain: "Ra8# — the king is attacked and every escape square is blocked. That's the famous back-rank mate." },
      { fen: "7k/8/6K1/8/8/8/8/3Q4 w - - 0 1", text: "King and queen vs king. Find checkmate — careful not to stalemate!", goal: { kind: "mate" }, hint: "Your king guards g7 and h7. Use the queen on the back row.", explain: "Qd8# — the queen covers the whole 8th row while your king takes away g7 and h7. A move like Qf7?? would leave Black with no legal move and no check: stalemate, a draw." },
    ],
  },
  {
    id: "special-moves",
    module: 2,
    title: "Special moves",
    objective: "Castle, capture en passant and promote a pawn.",
    level: "beginner",
    concepts: ["Castling", "En passant", "Promotion"],
    intro: "Three special rules: castling moves king and rook together; en passant lets a pawn capture another that just jumped two squares past it; promotion turns a pawn reaching the last row into a new piece.",
    steps: [
      { fen: "4k3/8/8/8/8/8/PPPPPPPP/RN2K2R w K - 0 1", text: "Castle kingside: move your king two squares toward the h1 rook.", goal: { kind: "san", accept: ["O-O"] }, hint: "Drag the king from e1 to g1. The rook hops over automatically.", explain: "Castling is allowed only if neither piece has moved, the squares between are empty, and the king isn't in or passing through check." },
      { fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1", text: "Black's pawn just jumped from d7 to d5. Capture it en passant.", goal: { kind: "san", accept: ["exd6"] }, hint: "Move your e5 pawn diagonally to d6 — the square the black pawn skipped.", explain: "En passant is only possible on the very next move after the two-square pawn jump." },
      { fen: "7k/4P3/8/8/8/8/8/4K3 w - - 0 1", text: "Push the pawn to e8 and promote it to a queen.", goal: { kind: "san", accept: ["e8=Q", "e8=Q+"] }, hint: "Move the pawn forward one square and choose the queen.", explain: "A promoted pawn can become a queen, rook, bishop or knight. Usually the queen is best." },
    ],
  },
  {
    id: "opening-principles",
    module: 3,
    title: "Opening principles",
    objective: "Start a game the way strong players do.",
    level: "beginner",
    concepts: ["Centre control", "Development", "King safety"],
    intro: "Three rules win most beginner games: control the centre, develop your knights and bishops, and castle your king to safety.",
    steps: [
      { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", text: "Play a pawn two squares into the centre.", goal: { kind: "san", accept: ["e4", "d4"] }, hint: "Try the e-pawn or the d-pawn.", explain: "Central pawns control key squares and open lines for your bishop and queen.", replies: ["e5", "d5"] },
      { text: "Develop a knight toward the centre.", goal: { kind: "san", accept: ["Nf3", "Nc3"] }, hint: "Knights belong on f3 and c3 early on.", explain: "Knights in the centre control many squares. 'Knights on the rim are dim' — avoid a3 and h3.", replies: ["Nc6", "Nf6"] },
      { text: "Now develop a bishop to an active square.", goal: { kind: "san", accept: ["Bc4", "Bb5", "Bd3", "Be2", "Bf4", "Bg5", "Be3", "Bd2"] }, hint: "Your e- or d-pawn moved, so one bishop has an open diagonal.", explain: "With minor pieces out, you are almost ready to castle and start real play.", replies: ["Nf6", "Bc5", "e6", "e5"] },
    ],
  },
  {
    id: "tactics-basics",
    module: 4,
    title: "Forks, pins & skewers",
    objective: "Recognise the three most common tactics.",
    level: "casual",
    concepts: ["Fork", "Pin", "Skewer"],
    intro: "Most games between club players are decided by simple tactics. A fork attacks two things at once; a pin freezes a piece in front of a more valuable one; a skewer is a pin in reverse.",
    steps: [
      { fen: "3q3k/6pp/8/4N3/8/8/6PP/6K1 w - - 0 1", text: "Fork: attack the king and queen with one move.", goal: { kind: "san", accept: ["Nf7+"] }, hint: "Which square lets the knight hit both h8 and d8?", explain: "Nf7+ — a 'royal fork'. Black must move the king and loses the queen." },
      { fen: "4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1", text: "Pin: freeze the black knight against its king.", goal: { kind: "san", accept: ["Bb5"] }, hint: "Line up your bishop with the knight and the king on the same diagonal.", explain: "Bb5 pins the knight: it can't legally move because that would expose its own king." },
      { fen: "6q1/8/8/3k4/8/8/8/1B2K3 w - - 0 1", text: "Skewer: check the king so you can take the queen behind it.", goal: { kind: "san", accept: ["Ba2+"] }, hint: "Find the diagonal that runs through d5 and g8.", explain: "Ba2+ — the king must step off the diagonal, and the bishop wins the queen." },
    ],
  },
];
