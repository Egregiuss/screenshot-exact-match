import { createFileRoute, Link } from "@tanstack/react-router";
import { MASTER_GAMES } from "@/data/masters";

export const Route = createFileRoute("/masters/")({
  head: () => ({
    meta: [
      { title: "Master Games — Gambit Coach" },
      { name: "description", content: "Replay legendary chess games by Morphy, Anderssen, Fischer and Kasparov with move-by-move explanations." },
      { property: "og:title", content: "Master Games — Gambit Coach" },
      { property: "og:description", content: "Learn from the most famous games in chess history." },
    ],
  }),
  component: MastersPage,
});

function MastersPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-4xl">Master Games</h1>
      <p className="mt-2 text-muted-foreground">Replay real games, pause at any moment, and try your own move against history.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {MASTER_GAMES.map((g) => (
          <Link key={g.id} to="/masters/$id" params={{ id: g.id }} className="card-paper block p-5 transition hover:-translate-y-0.5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{g.event} · {g.year}</p>
            <h2 className="mt-1 text-2xl">{g.nickname}</h2>
            <p className="mt-1 text-sm">{g.white} – {g.black} <span className="font-mono">{g.result}</span></p>
            <p className="mt-2 text-sm text-muted-foreground">{g.opening} ({g.eco})</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
