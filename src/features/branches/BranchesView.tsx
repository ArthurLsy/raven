import * as React from "react";
import { Icons } from "@/lib/icons";
import {
  api,
  errorMessage,
  type BranchesBundle,
  type EnrichedBranch,
  type TagInfo,
} from "@/lib/tauri";
import { useRepoStore } from "@/features/repository/repository.store";

const LANE_COLORS = [
  "oklch(0.72 0.18 285)",
  "oklch(0.78 0.13 210)",
  "oklch(0.80 0.16 75)",
  "oklch(0.78 0.16 15)",
  "oklch(0.78 0.11 150)",
  "oklch(0.78 0.15 305)",
];

function laneColor(idx: number) {
  return LANE_COLORS[idx % LANE_COLORS.length];
}

type Tab = "local" | "remote" | "tags";

export function BranchesView() {
  const repo = useRepoStore((s) => s.repo);
  const setError = useRepoStore((s) => s.setError);
  const setStatusMsg = useRepoStore((s) => s.setStatusMsg);
  const refreshStatus = useRepoStore((s) => s.refreshStatus);

  const [data, setData] = React.useState<BranchesBundle | null>(null);
  const [tab, setTab] = React.useState<Tab>("local");
  const [query, setQuery] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");

  const load = React.useCallback(async () => {
    if (!repo) return;
    try {
      const b = await api.listBranchesEnriched(repo.rootPath);
      setData(b);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [repo, setError]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (!repo) return null;

  const filterFn = (b: { name: string }) =>
    !query || b.name.toLowerCase().includes(query.toLowerCase());

  const local = data?.local.filter(filterFn) ?? [];
  const remote = data?.remote.filter(filterFn) ?? [];
  const tags = data?.tags.filter(filterFn) ?? [];

  async function handleCheckout(b: EnrichedBranch) {
    try {
      await api.checkoutBranch(repo!.rootPath, b.name);
      setStatusMsg(`✓ checked out ${b.name}`);
      await load();
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleMerge(b: EnrichedBranch) {
    if (
      !window.confirm(`Merge ${b.name} into ${repo!.currentBranch ?? "current"}?`)
    ) {
      return;
    }
    try {
      await api.mergeBranch(repo!.rootPath, b.name);
      setStatusMsg(`✓ merged ${b.name}`);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      await api.createBranch(repo!.rootPath, newName.trim());
      setNewName("");
      setCreating(false);
      setStatusMsg(`✓ created branch ${newName.trim()}`);
      await load();
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div
      className="col"
      style={{ flex: 1, minHeight: 0, background: "var(--bg-1)" }}
    >
      <div
        className="row"
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          gap: 10,
        }}
      >
        <div
          className="row"
          style={{
            background: "var(--bg-2)",
            padding: 3,
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        >
          {(
            [
              { k: "local" as const, l: "Local", c: data?.local.length ?? 0 },
              { k: "remote" as const, l: "Remote", c: data?.remote.length ?? 0 },
              { k: "tags" as const, l: "Tags", c: data?.tags.length ?? 0 },
            ]
          ).map((t) => {
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className="row gap-2"
                style={{
                  padding: "4px 12px",
                  borderRadius: 5,
                  background: active ? "var(--bg-1)" : "transparent",
                  color: active ? "var(--text)" : "var(--text-3)",
                  fontSize: 12,
                  fontWeight: 500,
                  border: active
                    ? "1px solid var(--border-2)"
                    : "1px solid transparent",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                  whiteSpace: "nowrap",
                }}
              >
                {t.l}
                <span
                  className="mono"
                  style={{
                    color: active ? "var(--text-3)" : "var(--text-4)",
                    fontSize: 10.5,
                  }}
                >
                  {t.c}
                </span>
              </button>
            );
          })}
        </div>
        <div
          className="row"
          style={{
            flex: 1,
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: "5px 10px",
            gap: 6,
          }}
        >
          <Icons.Search size={12} stroke="var(--text-4)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter branches…"
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
        {creating ? (
          <div className="row gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              placeholder="new-branch-name"
              className="mono"
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--accent-line)",
                borderRadius: 7,
                padding: "5px 10px",
                fontSize: 12,
                color: "var(--text)",
                width: 200,
              }}
            />
            <button
              onClick={handleCreate}
              className="row gap-1"
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                background: "var(--accent)",
                border: "1px solid var(--accent-2)",
                color: "var(--accent-fg)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Icons.Check size={12} />
              Create
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="row gap-2"
            style={{
              padding: "5px 12px",
              borderRadius: 7,
              background: "var(--accent)",
              border: "1px solid var(--accent-2)",
              color: "var(--accent-fg)",
              fontSize: 12,
              fontWeight: 600,
              boxShadow: "var(--shadow-sm)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <Icons.Plus size={12} />
            New branch
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "local" && (
          <>
            <SectionHeader title="Local branches" count={local.length}>
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                <span className="mono" style={{ color: "var(--add-fg)" }}>↑ ahead</span>
                {" / "}
                <span className="mono" style={{ color: "var(--status-mod)" }}>
                  ↓ behind
                </span>
              </span>
            </SectionHeader>
            {local.map((b) => (
              <BranchRow
                key={b.name}
                b={b}
                kind="local"
                onCheckout={() => handleCheckout(b)}
                onMerge={() => handleMerge(b)}
              />
            ))}
            {local.length === 0 && <Empty label="No local branches" />}
          </>
        )}
        {tab === "remote" && (
          <>
            <SectionHeader title="Remote branches" count={remote.length} />
            {remote.map((b) => (
              <BranchRow key={b.name} b={b} kind="remote" />
            ))}
            {remote.length === 0 && <Empty label="No remote branches" />}
          </>
        )}
        {tab === "tags" && (
          <>
            <SectionHeader title="Tags" count={tags.length} />
            {tags.map((t) => (
              <TagRow key={t.name} t={t} />
            ))}
            {tags.length === 0 && <Empty label="No tags" />}
          </>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="row"
      style={{
        padding: "14px 16px 8px",
        gap: 8,
        background: "var(--bg-1)",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: "var(--text-2)",
        }}
      >
        {title}
      </span>
      <span className="mono" style={{ color: "var(--text-4)", fontSize: 11 }}>
        {count}
      </span>
      <div style={{ flex: 1 }} />
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: 32,
        textAlign: "center",
        color: "var(--text-3)",
        fontSize: 12,
      }}
    >
      {label}
    </div>
  );
}

function BranchRow({
  b,
  kind,
  onCheckout,
  onMerge,
}: {
  b: EnrichedBranch;
  kind: "local" | "remote";
  onCheckout?: () => void;
  onMerge?: () => void;
}) {
  return (
    <div
      className="row"
      style={{
        padding: "10px 14px",
        gap: 12,
        borderBottom: "1px solid var(--border)",
        background: b.current ? "var(--accent-soft)" : "transparent",
        borderLeft: `2px solid ${b.current ? "var(--accent)" : "transparent"}`,
      }}
      onMouseEnter={(e) => {
        if (!b.current) e.currentTarget.style.background = "var(--hover)";
      }}
      onMouseLeave={(e) => {
        if (!b.current) e.currentTarget.style.background = "transparent";
      }}
    >
      <div
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: laneColor(b.lane),
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row gap-2" style={{ marginBottom: 2 }}>
          <span
            className="mono"
            style={{
              fontSize: 13,
              color: "var(--text)",
              fontWeight: b.current ? 600 : 500,
              letterSpacing: -0.1,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {b.name}
          </span>
          {b.current && (
            <span
              className="row gap-1"
              style={{
                padding: "1px 6px",
                borderRadius: 4,
                background: "var(--accent)",
                color: "var(--accent-fg)",
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              ● Current
            </span>
          )}
          {b.merged && (
            <span
              style={{
                padding: "1px 6px",
                borderRadius: 4,
                background: "var(--bg-3)",
                color: "var(--text-3)",
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              Merged
            </span>
          )}
          {b.stale && (
            <span
              style={{
                padding: "1px 6px",
                borderRadius: 4,
                background: "color-mix(in oklch, var(--status-mod) 18%, transparent)",
                color: "var(--status-mod)",
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              Stale
            </span>
          )}
        </div>
        {b.lastCommit && (
          <div
            className="row gap-2"
            style={{ fontSize: 11.5, color: "var(--text-3)" }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 460,
              }}
            >
              {b.lastCommit.msg}
            </span>
            <span style={{ color: "var(--text-4)" }}>·</span>
            <span>{b.lastCommit.author}</span>
            <span style={{ color: "var(--text-4)" }}>·</span>
            <span>{b.lastCommit.time}</span>
            <span style={{ color: "var(--text-4)" }}>·</span>
            <span className="mono" style={{ color: "var(--text-4)" }}>
              {b.lastCommit.short}
            </span>
          </div>
        )}
      </div>
      {kind === "local" && <SyncBars ahead={b.ahead} behind={b.behind} />}
      <div className="row gap-1" style={{ flexShrink: 0 }}>
        {!b.current && kind === "local" && (
          <button
            onClick={onCheckout}
            className="row gap-1"
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              background: "var(--accent-soft)",
              border: "1px solid var(--accent-line)",
              color: "var(--accent)",
              fontSize: 11,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            <Icons.Check size={11} />
            Checkout
          </button>
        )}
        {!b.current && kind === "local" && (
          <button
            onClick={onMerge}
            className="row gap-1"
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              background: "var(--bg-2)",
              border: "1px solid var(--border-2)",
              color: "var(--text-2)",
              fontSize: 11,
              whiteSpace: "nowrap",
            }}
          >
            <Icons.GitMerge size={11} />
            Merge
          </button>
        )}
      </div>
    </div>
  );
}

function SyncBars({ ahead, behind }: { ahead: number; behind: number }) {
  const max = Math.max(ahead, behind, 5);
  return (
    <div className="row gap-2" style={{ minWidth: 120 }}>
      <div className="row gap-1" style={{ flex: 1, justifyContent: "flex-end" }}>
        <span
          className="mono"
          style={{
            fontSize: 10.5,
            color: behind ? "var(--status-mod)" : "var(--text-4)",
            minWidth: 12,
            textAlign: "right",
          }}
        >
          {behind}
        </span>
        <div
          style={{
            width: 36,
            height: 5,
            background: "var(--bg-3)",
            borderRadius: 999,
            overflow: "hidden",
            display: "flex",
            flexDirection: "row-reverse",
          }}
        >
          <div
            style={{
              width: `${(behind / max) * 100}%`,
              background: "var(--status-mod)",
            }}
          />
        </div>
      </div>
      <div className="row gap-1" style={{ flex: 1 }}>
        <div
          style={{
            width: 36,
            height: 5,
            background: "var(--bg-3)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{ width: `${(ahead / max) * 100}%`, background: "var(--add-fg)" }}
          />
        </div>
        <span
          className="mono"
          style={{
            fontSize: 10.5,
            color: ahead ? "var(--add-fg)" : "var(--text-4)",
            minWidth: 12,
          }}
        >
          {ahead}
        </span>
      </div>
    </div>
  );
}

function TagRow({ t }: { t: TagInfo }) {
  return (
    <div
      className="row"
      style={{
        padding: "10px 14px",
        gap: 12,
        borderBottom: "1px solid var(--border)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          background: "color-mix(in oklch, var(--tone-amber) 18%, transparent)",
          color: "var(--tone-amber)",
          border: "1px solid color-mix(in oklch, var(--tone-amber) 40%, transparent)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icons.Diamond size={11} />
      </div>
      <span
        className="mono"
        style={{
          fontSize: 13,
          color: "var(--text)",
          fontWeight: 600,
          letterSpacing: -0.1,
        }}
      >
        {t.name}
      </span>
      <span style={{ color: "var(--text-4)" }}>·</span>
      <span className="mono" style={{ fontSize: 11, color: "var(--text-4)" }}>
        {t.short}
      </span>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 11, color: "var(--text-3)" }}>{t.time}</span>
    </div>
  );
}
