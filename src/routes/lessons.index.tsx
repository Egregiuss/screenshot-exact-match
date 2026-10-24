import { createFileRoute, Link } from "@tanstack/react-router";
import { LESSONS, MODULES } from "@/data/lessons";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/lessons/")({
  head: () => ({
    meta: [
      { title: "Chess Lessons — Gambit Coach" },
      { name: "description", content: "Interactive chess lessons from how the pieces move to forks, pins and skewers." },
      { property: "og:title", content: "Chess Lessons — Gambit Coach" },
      { property: "og:description", content: "Learn chess step by step on an interactive board." },
    ],
  }),
  component: LessonsPage,
});

function LessonsPage() {
  const progress = useProgress();
  const modules = [...new Set(LESSONS.map((l) => l.module))];
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-4xl">Lessons</h1>
      <p className="mt-2 text-muted-foreground">A step-by-step path from your very first move to your first tactics.</p>
      <p className="mt-1 text-sm text-muted-foreground">{progress.lessons.length} of {LESSONS.length} completed</p>
      {modules.map((m) => (
        <section key={m} className="mt-8">
          <h2 className="text-xs font-sans uppercase tracking-widest text-muted-foreground">Module {m} · {MODULES[m]}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {LESSONS.filter((l) => l.module === m).map((l) => {
              const done = progress.lessons.includes(l.id);
              return (
                <Link key={l.id} to="/lessons/$id" params={{ id: l.id }} className="card-paper block p-5 transition hover:-translate-y-0.5">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl">{l.title}</h3>
                    {done && <span className="text-sm font-semibold text-q-best">✓ Done</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{l.objective}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {l.concepts.map((c) => <span key={c} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{c}</span>)}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
