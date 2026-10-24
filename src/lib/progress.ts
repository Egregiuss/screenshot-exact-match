import { useEffect, useState } from "react";

export type Progress = {
  lessons: string[];
  puzzles: string[];
  games: { date: string; result: string; pgn: string; level: string; accuracy: number | null }[];
  qualityCounts: Record<string, number>;
};

const KEY = "chess-coach-progress-v1";
const EMPTY: Progress = { lessons: [], puzzles: [], games: [], qualityCounts: {} };

export function loadProgress(): Progress {
  if (typeof window === "undefined") return EMPTY;
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return EMPTY;
  }
}

export function updateProgress(fn: (p: Progress) => Progress) {
  const next = fn(loadProgress());
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("progress-updated"));
}

export function useProgress(): Progress {
  const [p, setP] = useState<Progress>(EMPTY);
  useEffect(() => {
    setP(loadProgress());
    const h = () => setP(loadProgress());
    window.addEventListener("progress-updated", h);
    return () => window.removeEventListener("progress-updated", h);
  }, []);
  return p;
}
