// Curated, well-documented historical games. Moves are public-domain game scores.
// Notes describe what happens on the board; they avoid invented quotations.

export type MasterGame = {
  id: string;
  white: string;
  black: string;
  event: string;
  site: string;
  year: number;
  result: "1-0" | "0-1" | "1/2-1/2";
  opening: string;
  eco: string;
  nickname: string;
  context: string;
  source: string;
  moves: string; // SAN, space-separated, no numbers
  notes: Record<number, string>; // keyed by ply (1 = White's first move)
};

export const MASTER_GAMES: MasterGame[] = [
  {
    id: "opera-game",
    white: "Paul Morphy",
    black: "Duke Karl of Brunswick & Count Isouard",
    event: "Casual game, Paris Opera",
    site: "Paris",
    year: 1858,
    result: "1-0",
    opening: "Philidor Defence",
    eco: "C41",
    nickname: "The Opera Game",
    context:
      "Played in a box at the Paris Opera during a performance. It is the classic demonstration of rapid development, open lines and a decisive attack against an uncastled king.",
    source: "Widely published game score (e.g. chessgames.com, Morphy's collected games)",
    moves:
      "e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#",
    notes: {
      6: "Black gives up the bishop pair to keep material level — but White recaptures with the queen and gains development.",
      13: "Qb3 hits both b7 and f7 at once — a double attack.",
      19: "Morphy sacrifices a knight to rip open the b-file and the a4–e8 diagonal while Black's king is still in the centre.",
      23: "Castling queenside brings the rook straight onto the open d-file — king safety and attack in one move.",
      25: "Another sacrifice: Rxd7 removes a key defender. White's pieces are all active, Black's are tangled.",
      31: "The queen sacrifice Qb8+ deflects the knight from d7, opening d8 for the rook.",
      33: "Rd8# — checkmate with just a rook and bishop. Every White piece played a role.",
    },
  },
  {
    id: "immortal-game",
    white: "Adolf Anderssen",
    black: "Lionel Kieseritzky",
    event: "Casual game, London",
    site: "London",
    year: 1851,
    result: "1-0",
    opening: "King's Gambit Accepted, Bishop's Gambit",
    eco: "C33",
    nickname: "The Immortal Game",
    context:
      "Played during a break at the first international tournament in London. White sacrifices both rooks, a bishop and the queen to deliver mate with minor pieces — a monument of the Romantic era.",
    source: "Widely published game score (e.g. chessgames.com)",
    moves:
      "e4 e5 f4 exf4 Bc4 Qh4+ Kf1 b5 Bxb5 Nf6 Nf3 Qh6 d3 Nh5 Nh4 Qg5 Nf5 c6 g4 Nf6 Rg1 cxb5 h4 Qg6 h5 Qg5 Qf3 Ng8 Bxf4 Qf6 Nc3 Bc5 Nd5 Qxb2 Bd6 Bxg1 e5 Qxa1+ Ke2 Na6 Nxg7+ Kd8 Qf6+ Nxf6 Be7#",
    notes: {
      3: "The King's Gambit: White offers a pawn to open the f-file and speed up development.",
      7: "White's king must move, losing castling rights — but Black's queen is out early too.",
      21: "White gives up the bishop on b5 to gain time against Black's queen.",
      35: "Bd6!! — White ignores the attack on the rook at g1. Development and threats matter more than material here.",
      37: "e5 cuts off Black's queen from the defence of the kingside.",
      43: "Qf6+!! — the final queen sacrifice, deflecting the knight.",
      45: "Be7# — mate delivered by a bishop, supported by two knights, with White down a huge amount of material.",
    },
  },
  {
    id: "game-of-the-century",
    white: "Donald Byrne",
    black: "Robert James Fischer",
    event: "Rosenwald Memorial",
    site: "New York",
    year: 1956,
    result: "0-1",
    opening: "Grünfeld Defence (via transposition)",
    eco: "D92",
    nickname: "The Game of the Century",
    context:
      "13-year-old Bobby Fischer defeated strong master Donald Byrne with a famous queen sacrifice. The game shows how piece activity and king safety can outweigh material.",
    source: "Widely published game score (e.g. chessgames.com)",
    moves:
      "Nf3 Nf6 c4 g6 Nc3 Bg7 d4 O-O Bf4 d5 Qb3 dxc4 Qxc4 c6 e4 Nbd7 Rd1 Nb6 Qc5 Bg4 Bg5 Na4 Qa3 Nxc3 bxc3 Nxe4 Bxe7 Qb6 Bc4 Nxc3 Bc5 Rfe8+ Kf1 Be6 Bxb6 Bxc4+ Kg1 Ne2+ Kf1 Nxd4+ Kg1 Ne2+ Kf1 Nc3+ Kg1 axb6 Qb4 Ra4 Qxb6 Nxd1 h3 Rxa2 Kh2 Nxf2 Re1 Rxe1 Qd8+ Bf8 Nxe1 Bd5 Nf3 Ne4 Qb8 b5 h4 h5 Ne5 Kg7 Kg1 Bc5+ Kf1 Ng3+ Ke1 Bb4+ Kd1 Bb3+ Kc1 Ne2+ Kb1 Nc3+ Kc1 Rc2#",
    notes: {
      22: "Na4!! — a stunning knight move. If White takes it, Black wins back material with tactics on the e4 pawn.",
      34: "Be6!! — Fischer offers his queen. Taking it unleashes a 'windmill' of discovered checks.",
      40: "A windmill: the knight checks again and again, picking up material while White's king is stuck.",
      46: "Black now has a rook, two bishops and a knight for the queen — overwhelming firepower.",
      82: "Rc2# — the minor pieces and rook coordinate to trap the king. Material count no longer matters.",
    },
  },
  {
    id: "kasparov-topalov",
    white: "Garry Kasparov",
    black: "Veselin Topalov",
    event: "Hoogovens Tournament",
    site: "Wijk aan Zee",
    year: 1999,
    result: "1-0",
    opening: "Pirc Defence",
    eco: "B07",
    nickname: "Kasparov's Immortal",
    context:
      "World Champion Kasparov launched a rook sacrifice that chased Black's king across the entire board. One of the deepest combinations ever played in top-level chess.",
    source: "Widely published game score (e.g. chessgames.com)",
    moves:
      "e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 c6 f3 b5 Nge2 Nbd7 Bh6 Bxh6 Qxh6 Bb7 a3 e5 O-O-O Qe7 Kb1 a6 Nc1 O-O-O Nb3 exd4 Rxd4 c5 Rd1 Nb6 g3 Kb8 Na5 Ba8 Bh3 d5 Qf4+ Ka7 Rhe1 d4 Nd5 Nbxd5 exd5 Qd6 Rxd4 cxd4 Re7+ Kb6 Qxd4+ Kxa5 b4+ Ka4 Qc3 Qxd5 Ra7 Bb7 Rxb7 Qc4 Qxf6 Kxa3 Qxa6+ Kxb4 c3+ Kxc3 Qa1+ Kd2 Qb2+ Kd1 Bf1 Rd2 Rd7 Rxd7 Bxc4 bxc4 Qxh8 Rd3 Qa8 c3 Qa4+ Ke1 f4 f5 Kc1 Rd2 Qa7",
    notes: {
      29: "Kasparov centralises before the storm: both sides have castled long and the centre is opening.",
      47: "Rxd4!! — a rook sacrifice. Kasparov had to see a very long forcing line to justify it.",
      49: "Re7+ begins the king hunt: the Black king is driven out toward the a-file.",
      53: "b4+ — the king is pulled further up the board into White's territory.",
      61: "Rxb7 — the second rook joins the attack after removing the bishop.",
      63: "Qxf6 and the attack continues. The Black king has walked all the way to a3.",
      87: "Topalov resigned here. White's material and the exposed king make the position hopeless.",
    },
  },
];

export function sanList(g: MasterGame): string[] {
  return g.moves.trim().split(/\s+/);
}
