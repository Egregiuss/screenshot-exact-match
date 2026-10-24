import { useMemo, useState, type CSSProperties } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";

export type BoardArrow = { from: string; to: string; kind?: "best" | "alt" };

type Props = {
  fen: string;
  orientation?: "white" | "black";
  interactive?: boolean;
  onMove?: (m: { from: string; to: string; promotion?: string }) => boolean | void;
  lastMove?: { from: string; to: string } | null;
  arrows?: BoardArrow[];
  highlight?: string[];
  id?: string;
};

export function Board({ fen, orientation = "white", interactive = true, onMove, lastMove, arrows = [], highlight = [], id = "board" }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const targets = useMemo(
    () => (selected ? chess.moves({ square: selected as Square, verbose: true }) : []),
    [selected, chess],
  );

  const isPromotion = (from: string, to: string) => {
    const p = chess.get(from as Square);
    return p?.type === "p" && (to[1] === "8" || to[1] === "1");
  };

  const attempt = (from: string, to: string): boolean => {
    const legal = chess.moves({ square: from as Square, verbose: true }).some((m) => m.to === to);
    if (!legal) return false;
    if (isPromotion(from, to)) {
      setPromo({ from, to });
      return false;
    }
    setSelected(null);
    return onMove?.({ from, to }) !== false;
  };

  const styles: Record<string, CSSProperties> = {};
  if (lastMove) {
    styles[lastMove.from] = { backgroundColor: "var(--board-last)" };
    styles[lastMove.to] = { backgroundColor: "var(--board-last)" };
  }
  for (const h of highlight) styles[h] = { backgroundColor: "var(--board-select)" };
  if (chess.inCheck()) {
    for (const row of chess.board())
      for (const p of row)
        if (p && p.type === "k" && p.color === chess.turn())
          styles[p.square] = { background: "radial-gradient(circle, var(--board-check) 35%, transparent 75%)" };
  }
  if (selected) {
    styles[selected] = { backgroundColor: "var(--board-select)" };
    for (const t of targets) {
      styles[t.to] = {
        ...(styles[t.to] || {}),
        backgroundImage: t.captured
          ? "radial-gradient(circle, transparent 58%, var(--board-dot) 60%)"
          : "radial-gradient(circle, var(--board-dot) 20%, transparent 22%)",
      };
    }
  }

  return (
    <div className="relative w-full select-none rounded-md shadow-board" role="application" aria-label="Chessboard">
      <Chessboard
        options={{
          id,
          position: fen,
          boardOrientation: orientation,
          allowDragging: interactive,
          squareStyles: styles,
          arrows: arrows.map((a) => ({
            startSquare: a.from,
            endSquare: a.to,
            color: a.kind === "alt" ? "var(--arrow-alt)" : "var(--arrow-best)",
          })),
          lightSquareStyle: { backgroundColor: "var(--board-light)" },
          darkSquareStyle: { backgroundColor: "var(--board-dark)" },
          boardStyle: { borderRadius: "6px", overflow: "hidden" },
          animationDurationInMs: 200,
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!interactive || !targetSquare) return false;
            return attempt(sourceSquare, targetSquare);
          },
          onSquareClick: ({ square, piece }) => {
            if (!interactive) return;
            if (selected && targets.some((t) => t.to === square)) {
              attempt(selected, square);
              return;
            }
            const p = chess.get(square as Square);
            if (piece && p && p.color === chess.turn()) setSelected(square === selected ? null : square);
            else setSelected(null);
          },
        }}
      />
      {promo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/60 backdrop-blur-sm rounded-md">
          <div className="card-paper p-4">
            <p className="mb-3 text-center font-display text-lg">Promote to…</p>
            <div className="flex gap-2">
              {(["q", "r", "b", "n"] as const).map((p) => (
                <button
                  key={p}
                  aria-label={{ q: "Queen", r: "Rook", b: "Bishop", n: "Knight" }[p]}
                  className="h-14 w-14 rounded-md bg-secondary text-3xl hover:bg-accent"
                  onClick={() => {
                    const m = { ...promo, promotion: p };
                    setPromo(null);
                    setSelected(null);
                    onMove?.(m);
                  }}
                >
                  {chess.turn() === "w" ? { q: "♕", r: "♖", b: "♗", n: "♘" }[p] : { q: "♛", r: "♜", b: "♝", n: "♞" }[p]}
                </button>
              ))}
            </div>
            <button className="mt-3 w-full text-sm text-muted-foreground" onClick={() => setPromo(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
