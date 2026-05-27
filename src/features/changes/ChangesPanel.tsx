import * as React from "react";
import { Icons } from "@/lib/icons";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { CHANGE_GROUPS, deriveGroup, type ChangeGroup } from "@/lib/colors";
import { api, errorMessage, type GitFileStatus } from "@/lib/tauri";
import { useRepoStore } from "@/features/repository/repository.store";
import { CommitComposer } from "@/features/commit/CommitComposer";

type GroupedFile = GitFileStatus & { group: ChangeGroup };

export function ChangesPanel() {
  const repo = useRepoStore((s) => s.repo);
  const status = useRepoStore((s) => s.status);
  const selectedFile = useRepoStore((s) => s.selectedFile);
  const selectFile = useRepoStore((s) => s.selectFile);
  const refreshStatus = useRepoStore((s) => s.refreshStatus);
  const setError = useRepoStore((s) => s.setError);

  const [query, setQuery] = React.useState("");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const files: GroupedFile[] = React.useMemo(() => {
    if (!status) return [];
    const q = query.trim().toLowerCase();
    return status.files
      .filter((f) => !q || f.path.toLowerCase().includes(q))
      .map((f) => ({ ...f, group: deriveGroup(f.path) }));
  }, [status, query]);

  const groups = React.useMemo(() => {
    const m: Record<ChangeGroup, GroupedFile[]> = {
      source: [],
      content: [],
      style: [],
      deps: [],
      docs: [],
    };
    for (const f of files) m[f.group].push(f);
    return m;
  }, [files]);

  if (!repo) return null;

  async function handleToggleStage(f: GitFileStatus) {
    if (!repo) return;
    try {
      if (f.staged) await api.unstageFile(repo.rootPath, f.path);
      else await api.stageFile(repo.rootPath, f.path);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleStageAllInGroup(group: ChangeGroup) {
    if (!repo) return;
    const items = groups[group];
    if (!items.length) return;
    const allStaged = items.every((f) => f.staged);
    try {
      for (const f of items) {
        if (allStaged) await api.unstageFile(repo.rootPath, f.path);
        else if (!f.staged) await api.stageFile(repo.rootPath, f.path);
      }
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleStageAll() {
    if (!repo) return;
    try {
      await api.stageAll(repo.rootPath);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleUnstageAll() {
    if (!repo) return;
    try {
      await api.unstageAll(repo.rootPath);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div
      className="col"
      style={{
        width: 340,
        borderRight: "1px solid var(--border)",
        background: "var(--bg-1)",
        flexShrink: 0,
        minHeight: 0,
      }}
    >
      <div
        className="row"
        style={{
          padding: "12px 14px",
          gap: 10,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "var(--text-2)",
          }}
        >
          Changes
        </div>
        <div className="mono" style={{ color: "var(--text-4)", fontSize: 11 }}>
          {files.length}
        </div>
        <div style={{ flex: 1 }} />
        <MasterCheckbox
          files={files}
          onStageAll={handleStageAll}
          onUnstageAll={handleUnstageAll}
        />
        <IconBtn title="Refresh" onClick={() => refreshStatus()}>
          <Icons.Refresh size={13} />
        </IconBtn>
      </div>

      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
        <div
          className="row"
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: "5px 8px",
            gap: 6,
          }}
        >
          <Icons.Search size={12} stroke="var(--text-4)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter changes…"
            style={{
              flex: 1,
              background: "transparent",
              border: 0,
              fontSize: 12,
              color: "var(--text)",
              minWidth: 0,
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {(["source", "content", "style", "deps", "docs"] as ChangeGroup[]).map((key) => {
          const items = groups[key];
          if (items.length === 0) return null;
          const isCollapsed = !!collapsed[key];
          const stagedCount = items.filter((f) => f.staged).length;
          return (
            <div key={key} style={{ borderBottom: "1px solid var(--border)" }}>
              <GroupHeader
                group={key}
                count={items.length}
                stagedCount={stagedCount}
                collapsed={isCollapsed}
                onToggleCollapse={() =>
                  setCollapsed((c) => ({ ...c, [key]: !c[key] }))
                }
                onToggleAll={() => handleStageAllInGroup(key)}
              />
              {!isCollapsed &&
                items.map((f) => (
                  <ChangeRow
                    key={f.path}
                    file={f}
                    selected={
                      selectedFile?.filePath === f.path &&
                      selectedFile?.staged === f.staged
                    }
                    onSelect={() =>
                      selectFile({ filePath: f.path, staged: f.staged })
                    }
                    onToggleStage={() => handleToggleStage(f)}
                  />
                ))}
            </div>
          );
        })}
        {files.length === 0 && (
          <div
            style={{
              padding: "32px 14px",
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-3)",
            }}
          >
            {query ? "No matches" : "Working tree clean"}
          </div>
        )}
      </div>

      <CommitComposer />
    </div>
  );
}

function MasterCheckbox({
  files,
  onStageAll,
  onUnstageAll,
}: {
  files: GroupedFile[];
  onStageAll: () => void;
  onUnstageAll: () => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const stagedCount = files.filter((f) => f.staged).length;
  const allStaged = files.length > 0 && stagedCount === files.length;
  const someStaged = stagedCount > 0 && !allStaged;

  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = someStaged;
  }, [someStaged]);

  function handleChange() {
    if (allStaged) onUnstageAll();
    else onStageAll();
  }

  return (
    <label
      title={allStaged ? "Unstage all" : "Stage all"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        cursor: files.length === 0 ? "default" : "pointer",
        color: "var(--text-3)",
        fontSize: 11,
        userSelect: "none",
      }}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={allStaged}
        onChange={handleChange}
        disabled={files.length === 0}
        style={{
          width: 13,
          height: 13,
          accentColor: "var(--accent)",
          cursor: files.length === 0 ? "default" : "pointer",
        }}
      />
    </label>
  );
}

function IconBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="hover-bg"
      style={{
        width: 22,
        height: 22,
        borderRadius: 5,
        color: "var(--text-3)",
        display: "grid",
        placeItems: "center",
      }}
    >
      {children}
    </button>
  );
}

function GroupHeader({
  group,
  count,
  stagedCount,
  collapsed,
  onToggleCollapse,
  onToggleAll,
}: {
  group: ChangeGroup;
  count: number;
  stagedCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onToggleAll: () => void;
}) {
  const info = CHANGE_GROUPS[group];
  const allStaged = stagedCount === count;
  return (
    <div
      onClick={onToggleCollapse}
      className="row"
      style={{
        gap: 8,
        padding: "10px 12px 6px",
        userSelect: "none",
      }}
    >
      <Icons.ChevronD
        size={11}
        style={{
          color: "var(--text-4)",
          transform: collapsed ? "rotate(-90deg)" : "rotate(0)",
          transition: "transform 150ms",
        }}
      />
      <span
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: 999,
          background: `var(--tone-${info.tone})`,
        }}
      />
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: "var(--text-2)",
        }}
      >
        {info.label}
      </span>
      <span className="mono" style={{ color: "var(--text-4)", fontSize: 10.5 }}>
        {count}
      </span>
      <div style={{ flex: 1 }} />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleAll();
        }}
        className="hover-bg"
        style={{
          fontSize: 10.5,
          color: "var(--text-3)",
          padding: "2px 6px",
          borderRadius: 4,
          whiteSpace: "nowrap",
        }}
      >
        {allStaged ? "Unstage" : "Stage all"}
      </button>
    </div>
  );
}

function ChangeRow({
  file,
  selected,
  onSelect,
  onToggleStage,
}: {
  file: GroupedFile;
  selected: boolean;
  onSelect: () => void;
  onToggleStage: () => void;
}) {
  const parts = file.path.split("/");
  const name = parts.pop() ?? file.path;
  const dir = parts.join("/");

  // Derive status char for the glyph from kind.
  const statusChar =
    file.kind === "modified"
      ? "M"
      : file.kind === "added"
        ? "A"
        : file.kind === "deleted"
          ? "D"
          : file.kind === "renamed"
            ? "R"
            : file.kind === "untracked"
              ? "??"
              : file.kind === "conflicted"
                ? "M"
                : "M";

  return (
    <div
      onClick={onSelect}
      style={{
        display: "grid",
        gridTemplateColumns: "20px 18px 1fr",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px 6px 8px",
        background: selected ? "var(--accent-soft)" : "transparent",
        borderLeft: `2px solid ${selected ? "var(--accent)" : "transparent"}`,
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = "var(--hover)";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = "transparent";
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleStage();
        }}
        title={file.staged ? "Unstage" : "Stage"}
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          border: `1px solid ${file.staged ? "var(--accent)" : "var(--border-strong)"}`,
          background: file.staged ? "var(--accent)" : "transparent",
          display: "grid",
          placeItems: "center",
        }}
      >
        {file.staged && <Icons.Check size={9} stroke="var(--accent-fg)" sw={3} />}
      </button>
      <StatusGlyph status={statusChar} size={16} />
      <div
        className="mono"
        style={{
          fontSize: 12,
          color: "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: -0.1,
        }}
      >
        {dir && <span style={{ color: "var(--text-4)" }}>{dir}/</span>}
        <span>{name}</span>
      </div>
    </div>
  );
}
