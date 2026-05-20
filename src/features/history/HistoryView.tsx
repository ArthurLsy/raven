import * as React from "react";
import { Icons } from "@/lib/icons";
import { api, errorMessage, type CommitSummary } from "@/lib/tauri";
import { useRepoStore } from "@/features/repository/repository.store";
import { Avatar } from "./Avatar";
import { RefChip } from "./RefChip";
import { CommitDetail } from "./CommitDetail";

const LANE_COLORS = [
  "var(--tone-indigo)",
  "var(--tone-cyan)",
  "var(--tone-amber)",
  "var(--tone-rose)",
  "var(--accent)",
  "var(--tone-slate)",
];

function laneColor(idx: number) {
  return LANE_COLORS[idx % LANE_COLORS.length];
}

export function HistoryView() {
  const repo = useRepoStore((s) => s.repo);
  const selectedHash = useRepoStore((s) => s.selectedHash);
  const selectHash = useRepoStore((s) => s.selectHash);
  const setError = useRepoStore((s) => s.setError);
  const [commits, setCommits] = React.useState<CommitSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | "mine" | "others">("all");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!repo) return;
    let cancelled = false;
    setLoading(true);
    api
      .getCommitHistory(repo.rootPath, 200)
      .then((c) => {
        if (cancelled) return;
        setCommits(c);
        if (c.length > 0 && !selectedHash) selectHash(c[0].hash);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return commits.filter((c) => {
      if (q) {
        if (
          !c.subject.toLowerCase().includes(q) &&
          !c.authorName.toLowerCase().includes(q) &&
          !c.hash.includes(q) &&
          !c.shortHash.includes(q)
        ) {
          return false;
        }
      }
      // Mine/Others heuristic: compare with current branch's last author email.
      // For MVP, treat first commit's author as "me".
      if (filter !== "all" && commits.length > 0) {
        const meEmail = commits[0].authorEmail;
        if (filter === "mine" && c.authorEmail !== meEmail) return false;
        if (filter === "others" && c.authorEmail === meEmail) return false;
      }
      return true;
    });
  }, [commits, filter, query]);

  const selected = commits.find((c) => c.hash === selectedHash) ?? null;

  if (!repo) return null;

  return (
    <div className="row" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
      <div
        className="col"
        style={{
          width: 460,
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
            History
          </div>
          <div className="mono" style={{ color: "var(--text-4)", fontSize: 11 }}>
            {filtered.length}
          </div>
          <div style={{ flex: 1 }} />
          {loading && (
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>Loading…</span>
          )}
        </div>

        {/* Filters */}
        <div
          className="row"
          style={{
            padding: "10px 14px",
            gap: 8,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            className="row"
            style={{
              flex: 1,
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
              placeholder="Filter by message, author, hash…"
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
          <div
            className="row"
            style={{
              background: "var(--bg-2)",
              padding: 2,
              borderRadius: 7,
              border: "1px solid var(--border)",
            }}
          >
            {(["all", "mine", "others"] as const).map((k) => {
              const active = filter === k;
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  style={{
                    padding: "3px 8px",
                    fontSize: 11,
                    fontWeight: 500,
                    background: active ? "var(--bg-1)" : "transparent",
                    color: active ? "var(--text)" : "var(--text-3)",
                    borderRadius: 5,
                    border: active
                      ? "1px solid var(--border-2)"
                      : "1px solid transparent",
                    boxShadow: active ? "var(--shadow-sm)" : "none",
                    textTransform: "capitalize",
                  }}
                >
                  {k}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {filtered.map((c, i) => (
            <CommitRow
              key={c.hash}
              commit={c}
              selected={c.hash === selectedHash}
              onSelect={() => selectHash(c.hash)}
              isFirst={i === 0}
              isLast={i === filtered.length - 1}
            />
          ))}
          {filtered.length === 0 && !loading && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--text-3)",
                fontSize: 12,
              }}
            >
              No commits
            </div>
          )}
        </div>
      </div>

      <CommitDetail commit={selected} />
    </div>
  );
}

function CommitRow({
  commit,
  selected,
  onSelect,
  isFirst,
  isLast,
}: {
  commit: CommitSummary;
  selected: boolean;
  onSelect: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: "grid",
        gridTemplateColumns: "60px 22px 1fr auto",
        gap: 10,
        alignItems: "center",
        padding: "8px 12px 8px 0",
        background: selected ? "var(--accent-soft)" : "transparent",
        borderLeft: `2px solid ${selected ? "var(--accent)" : "transparent"}`,
        borderBottom: "1px solid var(--border)",
        minHeight: 52,
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = "var(--hover)";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = "transparent";
      }}
    >
      <CommitGraphCell commit={commit} isFirst={isFirst} isLast={isLast} />
      <Avatar author={commit.authorName} />
      <div style={{ minWidth: 0 }}>
        <div className="row gap-2" style={{ marginBottom: 2, flexWrap: "nowrap" }}>
          {commit.refs.map((r) => (
            <RefChip key={r} name={r} />
          ))}
          <span
            style={{
              fontSize: 12.5,
              color: "var(--text)",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: -0.1,
            }}
          >
            {commit.subject}
          </span>
        </div>
        <div className="row gap-2" style={{ fontSize: 11, color: "var(--text-3)" }}>
          <span>{commit.authorName}</span>
          <span style={{ color: "var(--text-4)" }}>·</span>
          <span>{commit.date}</span>
          <span style={{ color: "var(--text-4)" }}>·</span>
          <span className="mono" style={{ color: "var(--text-4)" }}>
            {commit.shortHash}
          </span>
        </div>
      </div>
      <div
        className="row gap-3 mono"
        style={{ fontSize: 10.5, color: "var(--text-3)" }}
      >
        <span style={{ color: "var(--add-fg)" }}>+{commit.stats.a}</span>
        <span style={{ color: "var(--del-fg)" }}>−{commit.stats.d}</span>
      </div>
    </div>
  );
}

function CommitGraphCell({
  commit,
  isFirst,
  isLast,
}: {
  commit: CommitSummary;
  isFirst: boolean;
  isLast: boolean;
}) {
  const x = commit.branchColor * 10 + 6;
  const color = laneColor(commit.branchColor);
  const isMerge = commit.parents.length > 1;
  return (
    <div
      style={{
        width: 60,
        height: "100%",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <svg width="60" height="100%" style={{ position: "absolute", inset: 0 }}>
        {!isFirst && (
          <line
            x1={x}
            y1={0}
            x2={x}
            y2="50%"
            stroke={color}
            strokeWidth="1.5"
            opacity="0.5"
          />
        )}
        {!isLast && (
          <line
            x1={x}
            y1="50%"
            x2={x}
            y2="100%"
            stroke={color}
            strokeWidth="1.5"
            opacity="0.5"
          />
        )}
        <circle
          cx={x}
          cy="50%"
          r="4.5"
          fill={isMerge ? "var(--bg-1)" : color}
          stroke={color}
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
