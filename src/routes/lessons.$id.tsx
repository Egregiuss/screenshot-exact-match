import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "@/components/chess/Board";
import { LESSONS, MODULES } from "@/data/lessons";
import { updateProgress } from "@/lib/progress";

export const Route = createFileRoute("/lessons/$id")({
  loader: ({ params }) => {
    const lesson = LESSONS.find((l) => l.id === params.id);
    if (!lesson) throw notFound();
    return { lesson };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.lesson.title ?? "Lesson"} — Gambit Coach` },
      { name: "description", content: loaderData?.lesson.objective ?? "Interactive chess lesson" },
      { property: "og:title", content: `${loaderData?.lesson.title ?? "Lesson"} — Gambit Coach` },
      { property: "og:description", content: loaderData?.lesson.intro ?? "Interactive chess lesson" },
    ],
  }),
  component: LessonPage,
});

function LessonPage() {
  const { lesson } = Route.useLoaderData();
  const [step, setStep] = useState(0);
  const [fen, setFen] = useState(lesson.steps[0].fen!);
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [state, setState] = useState<"todo" | "wrong" | "right">("todo");
  const [showHint, setShowHint] = useState(false);
  const s = lesson.steps[step];
  const finished = step === lesson.steps.length - 1 && state === "right";

  useEffect(() => {
    setStep(0);
    setFen(lesson.steps[0].fen!);
    setState("todo");
    setLast(null);
  }, [lesson]);

  useEffect(() => {
    if (finished) updateProgress((p) => ({ ...p, lessons: [...new Set([...p.lessons, lesson.id])] }));
  }, [finished, lesson.id]);

  const onMove = ({ from, to, promotion }: { from: string; to: string; promotion?: string }) => {
    if (state === "right") return false;
    const c = new Chess(fen);
    let m;
    try {
      m = c.move({ from, to, promotion });
    } catch {
      return false;
    }
    const ok = s.goal.kind === "san" ? s.goal.accept.includes(m.san) : s.goal.kind === "check" ? c.inCheck() : c.isCheckmate();
    if (!ok) {
      setState("wrong");
      setShowHint(true);
      return false;
    }
    setFen(c.fen());
    setLast({ from: m.from, to: m.to });
    setState("right");
    if (s.replies) {
      const r = s.replies.find((x) => c.moves().includes(x));
      if (r) setTimeout(() => {
        const rm = c.move(r);
        setFen(c.fen());
        setLast({ from: rm.from, to: rm.to });
      }, 600);
    }
    return true;
  };

  const next = () => {
    const n = step + 1;
    const ns = lesson.steps[n];
    setStep(n);
    if (ns.fen) { setFen(ns.fen); setLast(null); }
    setState("todo");
    setShowHint(false);
  };

  const idx = LESSONS.findIndex((l) => l.id === lesson.id);
  const nextLesson = LESSONS[idx + 1];

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_400px]">
      <div><Board fen={fen} onMove={onMove} lastMove={last} interactive={state !== "right"} /></div>
      <aside className="space-y-4">
        <Link to="/lessons" className="text-sm text-muted-foreground hover:text-foreground">← All lessons</Link>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Module {lesson.module} · {MODULES[lesson.module]}</p>
        <h1 className="text-3xl">{lesson.title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{lesson.intro}</p>
        <div className="card-paper p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Step {step + 1} of {lesson.steps.length}</p>
          <p className="mt-2 font-display text-xl">{s.text}</p>
          {state === "wrong" && <p className="mt-3 text-sm text-q-mistake">Not quite — that's legal, but it isn't what we're practising. Try again.</p>}
          {showHint && state !== "right" && <p className="mt-2 text-sm"><span className="font-semibold">Hint: </span>{s.hint}</p>}
          {state === "right" && (
            <div className="mt-3 rounded-md border-l-4 border-q-best bg-secondary p-3 text-sm">
              <p className="font-semibold text-q-best">Correct!</p>
              <p className="mt-1">{s.explain}</p>
            </div>
          )}
          <div className="mt-4 flex gap-2 text-sm">
            {state !== "right" && !showHint && <button className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary" onClick={() => setShowHint(true)}>Show hint</button>}
            {state === "right" && step < lesson.steps.length - 1 && <button className="rounded-md bg-primary px-4 py-1.5 text-primary-foreground" onClick={next}>Next step →</button>}
            {finished && (nextLesson
              ? <Link to="/lessons/$id" params={{ id: nextLesson.id }} className="rounded-md bg-primary px-4 py-1.5 text-primary-foreground">Next lesson: {nextLesson.title} →</Link>
              : <Link to="/puzzles" className="rounded-md bg-primary px-4 py-1.5 text-primary-foreground">Try puzzles →</Link>)}
          </div>
        </div>
      </aside>
    </main>
  );
}
