import * as React from "react";
import { Icons } from "@/lib/icons";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { api, errorMessage, type Stash } from "@/lib/tauri";
import { useRepoStore } from "@/features/repository/repository.store";

export function StashView() {
  const repo = useRepoStore((s) => s.repo);
  const setError = useRepoStore((s) => s.setError);
  const setStatusMsg = useRepoStore((s) => s.setStatusMsg);
  const refreshStatus = useRepoStore((s) => s.refreshStatus);

  const [stashes, setStashes] = React.useState<Stash[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!repo) return;
    setLoading(true);
    try {
      const s = await api.listStashes(repo.rootPath);
      setStashes(s);
      if (s.length > 0 && !s.some((x) => x.id === selected)) {
        setSelected(s[0].id);
      } else if (s.length === 0) {
        setSelected(null);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, setError]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (!repo) return null;

  const selectedStash = stashes.find((s) => s.id === selected) ?? null;

  async function handlePop() {
    if (!repo || !selectedStash) return;
    try {
      await api.stashPop(repo.rootPath, selectedStash.id);
      setStatusMsg(`✓ popped ${selectedStash.id}`);
      await load();
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleApply() {
    if (!repo || !selectedStash) return;
    try {
      await api.stashApply(repo.rootPath, selectedStash.id);
      setStatusMsg(`✓ applied ${selectedStash.id} (kept)`);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleDrop() {
    if (!repo || !selectedStash) return;
    if (!window.confirm(`Drop ${selectedStash.id}? This cannot be undone.`)) return;
    try {
      await api.stashDrop(repo.rootPath, selectedStash.id);
      setStatusMsg(`✓ dropped ${selectedStash.id}`);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleCreate() {
    if (!repo) return;
    const msg = window.prompt("Stash message (optional):") ?? undefined;
    try {
      await api.stashCreate(repo.rootPath, msg ?? undefined);
      setStatusMsg("✓ stash created");
      await load();
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="row" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
      <div
        className="col"
        style={{
          width: 420,
          borderRight: "1px solid var(--border)",
          background: "var(--bg-1)",
          flexShrink: 0,
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
            Stashes
          </div>
          <span className="mono" style={{ color: "var(--text-4)", fontSize: 11 }}>
            {stashes.length}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleCreate}
            className="row gap-1"
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              background: "var(--bg-2)",
              border: "1px solid var(--border-2)",
              color: "var(--text-2)",
              fontSize: 11,
              whiteSpace: "nowrap",
            }}
          >
            <Icons.Plus size={11} />
            Stash changes
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {stashes.map((s) => (
            <StashCard
              key={s.id}
              stash={s}
              selected={selected === s.id}
              onSelect={() => setSelected(s.id)}
            />
          ))}
          {!loading && stashes.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--text-3)",
                fontSize: 12,
              }}
            >
              No stashes
            </div>
          )}
        </div>
      </div>
      <StashDetail
        stash={selectedStash}
        onPop={handlePop}
        onApply={handleApply}
        onDrop={handleDrop}
      />
    </div>
  );
}

function StashCard({
  stash,
  selected,
  onSelect,
}: {
  stash: Stash;
  selected: boolean;
  onSelect: () => void;
}) {
  const adds = stash.files.reduce((s, f) => s + f.a, 0);
  const dels = stash.files.reduce((s, f) => s + f.d, 0);
  return (
    <div
      onClick={onSelect}
      style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)",
        background: selected ? "var(--accent-soft)" : "transparent",
        borderLeft: `3px solid ${selected ? "var(--accent)" : "transparent"}`,
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = "var(--hover)";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = "transparent";
      }}
    >
      <div className="row gap-2" style={{ marginBottom: 6 }}>
        <span
          className="mono"
          style={{
            padding: "1px 6px",
            borderRadius: 4,
            background: "var(--bg-3)",
            color: "var(--accent)",
            fontSize: 10.5,
            fontWeight: 600,
            border: "1px solid var(--accent-line)",
          }}
        >
          {stash.id}
        </span>
        {stash.branch && (
          <span
            className="row gap-1"
            style={{
              padding: "1px 6px",
              borderRadius: 4,
              background: "var(--bg-3)",
              color: "var(--text-3)",
              fontSize: 10.5,
              fontWeight: 500,
            }}
          >
            <Icons.GitBranch size={9} />
            <span className="mono">{stash.branch}</span>
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>{stash.time}</span>
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text)",
          lineHeight: 1.4,
          fontWeight: 500,
          letterSpacing: -0.1,
          marginBottom: 8,
        }}
      >
        {stash.msg}
      </div>
      <div className="row gap-3" style={{ fontSize: 11, color: "var(--text-3)" }}>
        <span className="row gap-1">
          <Icons.File size={10} />
          {stash.files.length} file{stash.files.length === 1 ? "" : "s"}
        </span>
        <span className="mono" style={{ color: "var(--add-fg)" }}>+{adds}</span>
        <span className="mono" style={{ color: "var(--del-fg)" }}>−{dels}</span>
      </div>
    </div>
  );
}

function StashDetail({
  stash,
  onPop,
  onApply,
  onDrop,
}: {
  stash: Stash | null;
  onPop: () => void;
  onApply: () => void;
  onDrop: () => void;
}) {
  if (!stash) {
    return (
      <div
        className="col"
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-3)",
          gap: 10,
        }}
      >
        <Icons.Stash size={32} stroke="var(--text-4)" />
        <div style={{ fontSize: 13 }}>Select a stash to preview</div>
      </div>
    );
  }

  return (
    <div
      className="col"
      style={{ flex: 1, minHeight: 0, background: "var(--bg-0)" }}
    >
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-1)",
        }}
      >
        <div className="row gap-2" style={{ marginBottom: 10 }}>
          <span
            className="mono"
            style={{
              padding: "2px 8px",
              borderRadius: 5,
              background: "var(--accent-soft)",
              color: "var(--accent)",
              fontSize: 12,
              fontWeight: 600,
              border: "1px solid var(--accent-line)",
            }}
          >
            {stash.id}
          </span>
          {stash.branch && (
            <span
              className="row gap-1"
              style={{ fontSize: 12, color: "var(--text-3)" }}
            >
              <Icons.GitBranch size={11} />
              <span className="mono">{stash.branch}</span>
            </span>
          )}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{stash.time}</span>
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: 17,
            color: "var(--text)",
            fontWeight: 600,
            letterSpacing: -0.3,
            lineHeight: 1.35,
          }}
        >
          {stash.msg}
        </h2>
        <div className="row gap-2" style={{ marginTop: 14 }}>
          <button
            onClick={onPop}
            className="row gap-2"
            style={{
              padding: "6px 12px",
              borderRadius: 7,
              background: "var(--accent)",
              border: "1px solid var(--accent-2)",
              color: "var(--accent-fg)",
              fontSize: 12,
              fontWeight: 600,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Icons.Pull size={12} />
            Pop stash
          </button>
          <button
            onClick={onApply}
            className="row gap-2"
            style={{
              padding: "6px 12px",
              borderRadius: 7,
              background: "var(--bg-2)",
              border: "1px solid var(--border-2)",
              color: "var(--text)",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <Icons.Plus size={12} />
            Apply (keep)
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={onDrop}
            className="row gap-2"
            style={{
              padding: "6px 12px",
              borderRadius: 7,
              background: "transparent",
              border: "1px solid var(--border-2)",
              color: "var(--del-fg)",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <Icons.Trash size={12} />
            Drop
          </button>
        </div>
      </div>
      <div style={{ padding: "10px 0", flex: 1, overflow: "auto" }}>
        <div
          style={{
            padding: "6px 24px",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--text-3)",
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          Files in this stash
        </div>
        {stash.files.map((f, i) => {
          const parts = f.path.split("/");
          const name = parts.pop() ?? f.path;
          const dir = parts.join("/");
          return (
            <div
              key={i}
              className="row"
              style={{ padding: "8px 24px", gap: 12 }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <StatusGlyph status={f.status} size={16} />
              <span
                className="mono"
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: "var(--text)",
                  letterSpacing: -0.1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {dir && <span style={{ color: "var(--text-4)" }}>{dir}/</span>}
                <span>{name}</span>
              </span>
              <span
                className="mono"
                style={{ fontSize: 11, color: "var(--add-fg)" }}
              >
                +{f.a}
              </span>
              <span
                className="mono"
                style={{ fontSize: 11, color: "var(--del-fg)" }}
              >
                −{f.d}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
