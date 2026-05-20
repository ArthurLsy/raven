import * as React from "react";
import { Icons, type IconComponent } from "@/lib/icons";
import { Kbd } from "@/components/ui/kbd";
import {
  useRepoStore,
  type View,
} from "@/features/repository/repository.store";
import { api, errorMessage } from "@/lib/tauri";

const TABS: { k: View; I: IconComponent; label: string }[] = [
  { k: "changes", I: Icons.Changes, label: "Changes" },
  { k: "history", I: Icons.History, label: "History" },
  { k: "graph", I: Icons.Graph, label: "Graph" },
];

export function TopBar() {
  const repo = useRepoStore((s) => s.repo);
  const status = useRepoStore((s) => s.status);
  const view = useRepoStore((s) => s.view);
  const setView = useRepoStore((s) => s.setView);
  const setPaletteOpen = useRepoStore((s) => s.setPaletteOpen);
  const openRepository = useRepoStore((s) => s.openRepository);

  const changesBadge = status?.files.length ?? 0;
  const ahead = status?.ahead ?? 0;
  const behind = status?.behind ?? 0;

  const handlePickRepo = async () => {
    try {
      const p = await api.pickFolder();
      if (p) await openRepository(p);
    } catch (e) {
      useRepoStore.getState().setError(errorMessage(e));
    }
  };

  return (
    <div
      className="row"
      style={{
        height: 44,
        padding: "0 12px 0 16px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-1)",
        gap: 8,
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <button
        onClick={handlePickRepo}
        className="row gap-2"
        style={{
          padding: "4px 8px 4px 4px",
          borderRadius: 7,
          background: "var(--bg-2)",
          border: "1px solid var(--border-2)",
          flexShrink: 0,
          height: 30,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: "var(--accent-soft)",
            display: "grid",
            placeItems: "center",
            color: "var(--accent)",
          }}
        >
          <Icons.FolderOpen size={12} />
        </div>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--text)",
            whiteSpace: "nowrap",
          }}
        >
          {repo?.name ?? "Open repository"}
        </span>
        <Icons.ChevronD size={11} stroke="var(--text-3)" />
      </button>

      {repo && (
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--text-4)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
            flexShrink: 10,
          }}
          title={repo.rootPath}
        >
          {repo.rootPath}
        </span>
      )}

      <div style={{ flex: 1 }} />

      {repo && (
        <div
          className="row"
          style={{
            background: "var(--bg-2)",
            padding: 3,
            borderRadius: 8,
            border: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {TABS.map((t) => {
            const active = view === t.k;
            const badge = t.k === "changes" ? changesBadge : null;
            return (
              <button
                key={t.k}
                onClick={() => setView(t.k)}
                className="row gap-2"
                style={{
                  padding: "3px 10px",
                  borderRadius: 5,
                  background: active ? "var(--bg-1)" : "transparent",
                  color: active ? "var(--text)" : "var(--text-3)",
                  fontSize: 12,
                  fontWeight: 500,
                  border: active
                    ? "1px solid var(--border-2)"
                    : "1px solid transparent",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                }}
              >
                <t.I size={12} />
                {t.label}
                {badge != null && badge > 0 && (
                  <span
                    className="mono"
                    style={{
                      padding: "0 5px",
                      borderRadius: 999,
                      background: active ? "var(--accent-soft)" : "var(--bg-3)",
                      color: active ? "var(--accent)" : "var(--text-3)",
                      fontSize: 10,
                      fontWeight: 600,
                      lineHeight: "14px",
                      minHeight: 14,
                    }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1 }} />

      <button
        onClick={() => setPaletteOpen(true)}
        title="Quick action (⌘K)"
        className="row gap-2"
        style={{
          padding: "5px 8px",
          background: "var(--bg-2)",
          border: "1px solid var(--border-2)",
          borderRadius: 7,
          color: "var(--text-3)",
          fontSize: 12,
          flexShrink: 0,
          height: 30,
        }}
      >
        <Icons.Search size={11} />
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </button>

      {repo && (
        <div className="row" style={{ gap: 4, flexShrink: 0 }}>
          <RemoteButton kind="fetch" />
          <RemoteButton kind="pull" badge={behind} />
          <RemoteButton kind="push" badge={ahead} primary />
        </div>
      )}

      {repo && <BranchPill ahead={ahead} behind={behind} branch={repo.currentBranch} />}
    </div>
  );
}

function RemoteButton({
  kind,
  badge,
  primary,
}: {
  kind: "fetch" | "pull" | "push";
  badge?: number;
  primary?: boolean;
}) {
  const repo = useRepoStore((s) => s.repo);
  const refreshStatus = useRepoStore((s) => s.refreshStatus);
  const setError = useRepoStore((s) => s.setError);
  const setStatusMsg = useRepoStore((s) => s.setStatusMsg);
  const [busy, setBusy] = React.useState(false);

  const I =
    kind === "fetch" ? Icons.Fetch : kind === "pull" ? Icons.Pull : Icons.Push;
  const label = kind === "fetch" ? "Fetch" : kind === "pull" ? "Pull" : "Push";

  async function run() {
    if (!repo) return;
    setBusy(true);
    try {
      if (kind === "fetch") await api.fetch(repo.rootPath);
      if (kind === "pull") await api.pull(repo.rootPath);
      if (kind === "push") await api.push(repo.rootPath);
      setStatusMsg(`✓ ${label} succeeded`);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const showBadge = badge != null && badge > 0;

  return (
    <button
      onClick={run}
      disabled={busy}
      className="row gap-2"
      style={{
        padding: "5px 10px",
        background: primary ? "var(--accent)" : "var(--bg-2)",
        border: `1px solid ${primary ? "var(--accent-2)" : "var(--border-2)"}`,
        borderRadius: 7,
        color: primary ? "var(--accent-fg)" : showBadge ? "var(--text)" : "var(--text-2)",
        fontSize: 12,
        fontWeight: 500,
        boxShadow: primary ? "var(--shadow-sm)" : "none",
        whiteSpace: "nowrap",
        height: 30,
        opacity: busy ? 0.6 : 1,
      }}
    >
      <I size={12} />
      {label}
      {showBadge && (
        <span
          className="mono"
          style={{
            padding: "0 5px",
            borderRadius: 999,
            background: primary ? "rgba(255,255,255,0.22)" : "var(--accent-soft)",
            color: primary ? "var(--accent-fg)" : "var(--accent)",
            fontSize: 10,
            fontWeight: 700,
            lineHeight: "14px",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function BranchPill({
  branch,
  ahead,
  behind,
}: {
  branch: string | null;
  ahead: number;
  behind: number;
}) {
  return (
    <button
      className="row gap-2"
      style={{
        padding: "5px 8px 5px 10px",
        background: "var(--bg-2)",
        border: "1px solid var(--border-2)",
        borderRadius: 7,
        color: "var(--text)",
        fontSize: 12,
        flexShrink: 0,
        height: 30,
      }}
    >
      <Icons.GitBranch size={12} stroke="var(--text-3)" />
      <span
        className="mono"
        style={{
          fontWeight: 500,
          whiteSpace: "nowrap",
          maxWidth: 180,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {branch ?? "detached"}
      </span>
      <span style={{ color: "var(--text-4)" }}>·</span>
      <span
        className="mono row gap-1"
        style={{
          color: "var(--text-3)",
          fontSize: 11,
          whiteSpace: "nowrap",
        }}
      >
        <Icons.Push size={10} stroke="var(--add-fg)" /> {ahead}
        <Icons.Pull size={10} stroke="var(--status-mod)" /> {behind}
      </span>
      <Icons.ChevronD size={11} stroke="var(--text-3)" />
    </button>
  );
}
