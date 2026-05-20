import { Icons } from "@/lib/icons";
import { useRepoStore } from "@/features/repository/repository.store";

export function StatusBar() {
  const repo = useRepoStore((s) => s.repo);
  const statusMsg = useRepoStore((s) => s.statusMsg);
  const status = useRepoStore((s) => s.status);

  return (
    <div
      className="row"
      style={{
        height: 24,
        padding: "0 10px",
        background: "var(--bg-1)",
        borderTop: "1px solid var(--border)",
        gap: 12,
        fontSize: 10.5,
        color: "var(--text-3)",
        flexShrink: 0,
      }}
    >
      <span className="row gap-1">
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: repo ? "var(--add-fg)" : "var(--text-4)",
          }}
          className={repo ? "pulse-dot" : undefined}
        />
        {repo ? "Connected" : "No repository"}
      </span>
      {repo && (
        <>
          <span>·</span>
          <span className="row gap-1">
            <Icons.GitBranch size={10} />
            <span className="mono">{repo.currentBranch ?? "detached"}</span>
          </span>
          {status && (status.ahead > 0 || status.behind > 0) && (
            <>
              <span>·</span>
              <span className="row gap-2 mono">
                <span>↑{status.ahead}</span>
                <span>↓{status.behind}</span>
              </span>
            </>
          )}
        </>
      )}
      <div style={{ flex: 1 }} />
      {statusMsg && <span style={{ color: "var(--text-2)" }}>{statusMsg}</span>}
    </div>
  );
}
