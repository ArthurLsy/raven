import * as React from "react";
import { IconRail } from "@/components/layout/IconRail";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { ErrorBanner } from "@/components/layout/ErrorBanner";
import { Icons } from "@/lib/icons";
import { Kbd } from "@/components/ui/kbd";
import { api, type RecentRepo } from "@/lib/tauri";
import { useRepoStore } from "@/features/repository/repository.store";
import { ChangesView } from "@/features/changes/ChangesView";
import { HistoryView } from "@/features/history/HistoryView";
import { GraphView } from "@/features/graph/GraphView";
import { BranchesView } from "@/features/branches/BranchesView";
import { StashView } from "@/features/stash/StashView";
import { CommandPalette } from "@/features/palette/CommandPalette";

export default function App() {
  const repo = useRepoStore((s) => s.repo);
  const view = useRepoStore((s) => s.view);
  const setPaletteOpen = useRepoStore((s) => s.setPaletteOpen);

  // Global shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPaletteOpen]);

  return (
    <div className="row" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
      <IconRail />
      <div className="col" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
        <TopBar />
        <ErrorBanner />
        <main
          style={{
            flex: 1,
            minHeight: 0,
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {!repo ? (
            <EmptyState />
          ) : view === "changes" ? (
            <ChangesView />
          ) : view === "history" ? (
            <HistoryView />
          ) : view === "graph" ? (
            <GraphView />
          ) : view === "branches" ? (
            <BranchesView />
          ) : (
            <StashView />
          )}
          <CommandPalette />
        </main>
        <StatusBar />
      </div>
    </div>
  );
}

function EmptyState() {
  const openRepository = useRepoStore((s) => s.openRepository);
  const setError = useRepoStore((s) => s.setError);
  const recents = useRepoStore((s) => s.recents);
  const refreshRecents = useRepoStore((s) => s.refreshRecents);

  React.useEffect(() => {
    refreshRecents();
  }, [refreshRecents]);

  async function handlePick() {
    try {
      const path = await api.pickFolder();
      if (path) await openRepository(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div
      className="col"
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: 32,
      }}
    >
      <div className="col" style={{ alignItems: "center", gap: 10, textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            display: "grid",
            placeItems: "center",
            color: "var(--text-3)",
          }}
        >
          <Icons.GitBranch size={24} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
          Open a Git repository
        </div>
        <div style={{ fontSize: 13, color: "var(--text-3)", maxWidth: 360 }}>
          Select a local folder containing a Git repository to inspect changes, view
          diffs, and create commits.
        </div>
      </div>

      {recents.length > 0 && (
        <div className="col" style={{ width: "100%", maxWidth: 440, gap: 4 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-4)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            Recent
          </div>
          {recents.map((r) => (
            <RecentRepoRow key={r.id} repo={r} />
          ))}
        </div>
      )}

      <div className="col" style={{ alignItems: "center", gap: 10 }}>
        <button
          onClick={handlePick}
          className="row gap-2"
          style={{
            padding: "8px 16px",
            background: "var(--accent)",
            border: "1px solid var(--accent-2)",
            borderRadius: 8,
            color: "var(--accent-fg)",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <Icons.FolderOpen size={14} />
          Open Repository…
        </button>
        <div className="row gap-2" style={{ color: "var(--text-4)", fontSize: 12 }}>
          Or press <Kbd>⌘</Kbd> <Kbd>K</Kbd>
        </div>
      </div>
    </div>
  );
}

function RecentRepoRow({ repo }: { repo: RecentRepo }) {
  const openRepository = useRepoStore((s) => s.openRepository);
  const setError = useRepoStore((s) => s.setError);
  const refreshRecents = useRepoStore((s) => s.refreshRecents);
  const [hovered, setHovered] = React.useState(false);

  async function handleOpen() {
    try {
      await openRepository(repo.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.removeRecentRepo(repo.path);
      await refreshRecents();
    } catch {
      // ignore
    }
  }

  return (
    <button
      onClick={handleOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="row gap-3"
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        background: hovered ? "var(--bg-2)" : "transparent",
        border: `1px solid ${hovered ? "var(--border-2)" : "transparent"}`,
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
        transition: "background 0.1s, border-color 0.1s",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 7,
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          color: "var(--text-3)",
        }}
      >
        <Icons.FolderOpen size={13} />
      </div>
      <div className="col" style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {repo.name}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--text-4)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {repo.path}
        </span>
      </div>
      {hovered && (
        <button
          onClick={handleRemove}
          title="Remove from recents"
          style={{
            padding: 4,
            borderRadius: 4,
            background: "transparent",
            border: "none",
            color: "var(--text-4)",
            flexShrink: 0,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icons.X size={12} />
        </button>
      )}
    </button>
  );
}
