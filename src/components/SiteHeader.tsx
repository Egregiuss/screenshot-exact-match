import { Link } from "@tanstack/react-router";

const NAV = [
  { to: "/play", label: "Play" },
  { to: "/lessons", label: "Lessons" },
  { to: "/puzzles", label: "Puzzles" },
  { to: "/masters", label: "Master Games" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <span className="text-2xl text-brass">♞</span> Gambit Coach
        </Link>
        <nav className="flex gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-1.5 bg-secondary text-foreground font-semibold" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
