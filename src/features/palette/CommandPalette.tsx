import * as React from "react";
import { Icons, type IconComponent } from "@/lib/icons";
import { Kbd } from "@/components/ui/kbd";
import { useRepoStore, type View } from "@/features/repository/repository.store";
import { useTweaks } from "@/features/tweaks/tweaks.store";
import { api, errorMessage } from "@/lib/tauri";

type Item = {
  g: string;
  i: IconComponent;
  l: string;
  k?: string;
  run: () => void | Promise<void>;
};

export function CommandPalette() {
  const open = useRepoStore((s) => s.paletteOpen);
  const setOpen = useRepoStore((s) => s.setPaletteOpen);
  const setView = useRepoStore((s) => s.setView);
  const setAiOpen = useRepoStore((s) => s.setAiOpen);
  const openRepository = useRepoStore((s) => s.openRepository);
  const refreshStatus = useRepoStore((s) => s.refreshStatus);
  const setError = useRepoStore((s) => s.setError);
  const setStatusMsg = useRepoStore((s) => s.setStatusMsg);
  const repo = useRepoStore((s) => s.repo);
  const toggleTheme = () => {
    const cur = useTweaks.getState().theme;
    useTweaks.getState().set("theme", cur === "dark" ? "light" : "dark");
  };

  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const switchTo = (v: View) => {
    setView(v);
    setOpen(false);
  };

  const remote = async (op: "fetch" | "pull" | "push") => {
    if (!repo) return;
    try {
      if (op === "fetch") await api.fetch(repo.rootPath);
      if (op === "pull") await api.pull(repo.rootPath);
      if (op === "push") await api.push(repo.rootPath);
      setStatusMsg(`✓ ${op} succeeded`);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
    setOpen(false);
  };

  const all: Item[] = [
    {
      g: "Actions",
      i: Icons.Sparkles,
      l: "Generate commit message",
      k: "⌘ J",
      run: () => {
        setAiOpen(true);
        setOpen(false);
      },
    },
    { g: "Actions", i: Icons.Push, l: "Push to origin", k: "⇧ ⌘ P", run: () => remote("push") },
    { g: "Actions", i: Icons.Pull, l: "Pull from origin", k: "⇧ ⌘ L", run: () => remote("pull") },
    { g: "Actions", i: Icons.Fetch, l: "Fetch", run: () => remote("fetch") },
    { g: "View", i: Icons.Changes, l: "Show changes", run: () => switchTo("changes") },
    { g: "View", i: Icons.History, l: "Show commit history", run: () => switchTo("history") },
    { g: "View", i: Icons.Graph, l: "Show branch graph", run: () => switchTo("graph") },
    { g: "View", i: Icons.GitBranch, l: "Show branches", run: () => switchTo("branches") },
    { g: "View", i: Icons.Stash, l: "Show stashes", run: () => switchTo("stash") },
    {
      g: "Appearance",
      i: Icons.Sun,
      l: "Toggle theme (dark / light)",
      run: () => {
        toggleTheme();
        setOpen(false);
      },
    },
    {
      g: "Repo",
      i: Icons.FolderOpen,
      l: "Open repository…",
      k: "⌘ O",
      run: async () => {
        try {
          const p = await api.pickFolder();
          if (p) await openRepository(p);
        } catch (e) {
          setError(errorMessage(e));
        }
        setOpen(false);
      },
    },
  ];

  const items = React.useMemo(() => {
    if (!q.trim()) return all;
    const needle = q.trim().toLowerCase();
    return all.filter((it) => it.l.toLowerCase().includes(needle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, repo]);

  React.useEffect(() => {
    if (!open) return;
    setQ("");
    setSel(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowDown") {
        setSel((s) => Math.min(s + 1, items.length - 1));
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        setSel((s) => Math.max(s - 1, 0));
        e.preventDefault();
      } else if (e.key === "Enter") {
        const item = items[sel];
        if (item) item.run();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, items, sel, setOpen]);

  if (!open) return null;

  // Group items.
  const grouped: Record<string, Item[]> = {};
  items.forEach((it) => {
    (grouped[it.g] = grouped[it.g] ?? []).push(it);
  });

  return (
    <div
      onClick={() => setOpen(false)}
      className="fade-in"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "start center",
        paddingTop: 90,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="slide-up"
        style={{
          width: 580,
          background: "var(--bg-1)",
          border: "1px solid var(--border-2)",
          borderRadius: 14,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
      >
        <div
          className="row"
          style={{
            padding: "10px 14px",
            gap: 10,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <Icons.Search size={14} stroke="var(--text-3)" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            placeholder="Type a command…"
            style={{
              flex: 1,
              background: "transparent",
              border: 0,
              fontSize: 14,
              color: "var(--text)",
            }}
          />
          <Kbd>esc</Kbd>
        </div>
        <div style={{ maxHeight: 380, overflow: "auto", padding: 6 }}>
          {Object.entries(grouped).map(([g, gItems]) => (
            <div key={g}>
              <div
                style={{
                  padding: "8px 10px 4px",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-4)",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                {g}
              </div>
              {gItems.map((it) => {
                const idx = items.indexOf(it);
                const active = idx === sel;
                const I = it.i;
                return (
                  <button
                    key={it.l}
                    onMouseEnter={() => setSel(idx)}
                    onClick={() => it.run()}
                    className="row gap-3"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 7,
                      background: active ? "var(--accent-soft)" : "transparent",
                      border: `1px solid ${
                        active ? "var(--accent-line)" : "transparent"
                      }`,
                    }}
                  >
                    <span
                      style={{
                        color: active ? "var(--accent)" : "var(--text-3)",
                      }}
                    >
                      <I size={13} />
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--text)",
                        flex: 1,
                        textAlign: "left",
                      }}
                    >
                      {it.l}
                    </span>
                    {it.k && (
                      <span className="row gap-1">
                        {it.k.split(" ").map((c, i) => (
                          <Kbd key={i}>{c}</Kbd>
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {items.length === 0 && (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--text-4)",
                fontSize: 12,
              }}
            >
              No matching commands
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
