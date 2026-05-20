import * as React from "react";
import { IconRail } from "@/components/layout/IconRail";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { ErrorBanner } from "@/components/layout/ErrorBanner";
import { Icons } from "@/lib/icons";
import { Kbd } from "@/components/ui/kbd";
import { api } from "@/lib/tauri";
import { useRepoStore } from "@/features/repository/repository.store";
import { ChangesView } from "@/features/changes/ChangesView";
import { HistoryView } from "@/features/history/HistoryView";
import { GraphView } from "@/features/graph/GraphView";
import { BranchesView } from "@/features/branches/BranchesView";
import { StashView } from "@/features/stash/StashView";
import { AISuggestModal } from "@/features/ai/AISuggestModal";
import { CommandPalette } from "@/features/palette/CommandPalette";

export default function App() {
  const repo = useRepoStore((s) => s.repo);
  const view = useRepoStore((s) => s.view);
  const setAiOpen = useRepoStore((s) => s.setAiOpen);
  const setPaletteOpen = useRepoStore((s) => s.setPaletteOpen);

  // Global shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (meta && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        setAiOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setAiOpen, setPaletteOpen]);

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
          <AISuggestModal />
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
        gap: 14,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 14,
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          display: "grid",
          placeItems: "center",
          color: "var(--text-3)",
        }}
      >
        <Icons.GitBranch size={26} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
        Open a Git repository
      </div>
      <div style={{ fontSize: 13, color: "var(--text-3)", maxWidth: 360 }}>
        Select a local folder containing a Git repository to inspect changes, view
        diffs, and create commits.
      </div>
      <button
        onClick={handlePick}
        className="row gap-2"
        style={{
          marginTop: 6,
          padding: "8px 14px",
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
        Open Repository
      </button>
      <div className="row gap-2" style={{ marginTop: 10, color: "var(--text-4)", fontSize: 12 }}>
        Or press <Kbd>⌘</Kbd> <Kbd>K</Kbd>
      </div>
    </div>
  );
}
