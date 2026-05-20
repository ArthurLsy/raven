import * as React from "react";
import { api, errorMessage, type CommitSummary } from "@/lib/tauri";
import { useRepoStore } from "@/features/repository/repository.store";
import { Avatar } from "@/features/history/Avatar";
import { RefChip } from "@/features/history/RefChip";
import { CommitDetail } from "@/features/history/CommitDetail";

const LANE_W = 28;
const ROW_H = 56;

const LANE_COLORS = [
  "oklch(0.72 0.18 285)",
  "oklch(0.78 0.13 210)",
  "oklch(0.80 0.16 75)",
  "oklch(0.78 0.16 15)",
  "oklch(0.78 0.11 150)",
  "oklch(0.78 0.15 305)",
  "oklch(0.78 0.10 240)",
  "oklch(0.78 0.18 25)",
];

function laneColor(idx: number) {
  return LANE_COLORS[idx % LANE_COLORS.length];
}

type RowLayout = {
  commit: CommitSummary;
  lane: number;
  preLanes: (string | null)[];
  postLanes: (string | null)[];
  parentLanes: number[];
};

function buildLayout(commits: CommitSummary[]) {
  const rows: RowLayout[] = [];
  const lanes: (string | null)[] = [];
  let maxLanes = 0;

  for (const c of commits) {
    const preLanes = [...lanes];
    let lane = lanes.findIndex((h) => h === c.hash);
    if (lane === -1) {
      lane = lanes.findIndex((h) => h === null);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(null);
      }
    }
    lanes[lane] = null;
    const parentLanes: number[] = [];

    c.parents.forEach((p, i) => {
      if (i === 0) {
        lanes[lane] = p;
        parentLanes.push(lane);
      } else {
        let plane = lanes.findIndex((h) => h === p);
        if (plane === -1) {
          plane = lanes.findIndex((h) => h === null);
          if (plane === -1) {
            plane = lanes.length;
            lanes.push(null);
          }
          lanes[plane] = p;
        }
        parentLanes.push(plane);
      }
    });

    while (lanes.length > 0 && lanes[lanes.length - 1] == null) {
      lanes.pop();
    }

    const postLanes = [...lanes];
    maxLanes = Math.max(maxLanes, preLanes.length, postLanes.length, lane + 1);
    rows.push({ commit: c, lane, preLanes, postLanes, parentLanes });
  }
  return { rows, maxLanes };
}

export function GraphView() {
  const repo = useRepoStore((s) => s.repo);
  const setError = useRepoStore((s) => s.setError);
  const selectedHash = useRepoStore((s) => s.selectedHash);
  const selectHash = useRepoStore((s) => s.selectHash);
  const [commits, setCommits] = React.useState<CommitSummary[]>([]);

  React.useEffect(() => {
    if (!repo) return;
    let cancelled = false;
    api
      .getCommitHistory(repo.rootPath, 300)
      .then((c) => {
        if (cancelled) return;
        setCommits(c);
        if (c.length > 0 && !selectedHash) selectHash(c[0].hash);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo]);

  const { rows, maxLanes } = React.useMemo(() => buildLayout(commits), [commits]);
  const graphWidth = (maxLanes + 1) * LANE_W;

  // Compute active lane names for the legend.
  const lanes = React.useMemo(() => {
    const m = new Map<number, string>();
    for (const row of rows) {
      for (const ref of row.commit.refs) {
        let name = ref;
        if (ref.startsWith("HEAD -> ")) name = ref.slice("HEAD -> ".length);
        else if (ref.startsWith("tag: ")) continue;
        if (!m.has(row.lane)) m.set(row.lane, name);
      }
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a - b)
      .map(([lane, name]) => ({ lane, name }));
  }, [rows]);

  const selected = commits.find((c) => c.hash === selectedHash) ?? null;

  if (!repo) return null;

  return (
    <div className="col" style={{ flex: 1, minHeight: 0 }}>
      <LaneLegend lanes={lanes} />
      <div
        className="row"
        style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}
      >
        <div
          className="col"
          style={{
            flex: 1,
            minWidth: 0,
            borderRight: "1px solid var(--border)",
            background: "var(--bg-1)",
          }}
        >
          <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {rows.map((row, i) => (
                <li
                  key={row.commit.hash}
                  onClick={() => selectHash(row.commit.hash)}
                  className="row"
                  style={{
                    height: ROW_H,
                    cursor: "default",
                    background:
                      row.commit.hash === selectedHash
                        ? "var(--accent-soft)"
                        : "transparent",
                    borderLeft: `2px solid ${
                      row.commit.hash === selectedHash ? "var(--accent)" : "transparent"
                    }`,
                    borderBottom: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => {
                    if (row.commit.hash !== selectedHash)
                      e.currentTarget.style.background = "var(--hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (row.commit.hash !== selectedHash)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <RowGraph row={row} width={graphWidth} isLast={i === rows.length - 1} />
                  <RowMeta row={row} />
                </li>
              ))}
              {rows.length === 0 && (
                <li
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "var(--text-3)",
                    fontSize: 12,
                  }}
                >
                  No commits
                </li>
              )}
            </ul>
          </div>
        </div>
        <div style={{ width: 460, flexShrink: 0, display: "flex" }}>
          <CommitDetail commit={selected} />
        </div>
      </div>
    </div>
  );
}

function LaneLegend({ lanes }: { lanes: { lane: number; name: string }[] }) {
  if (lanes.length === 0) return null;
  return (
    <div
      className="row"
      style={{
        padding: "10px 14px",
        gap: 14,
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-1)",
        overflow: "auto",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 10.5,
          color: "var(--text-4)",
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        Lanes
      </span>
      {lanes.map((l) => (
        <div key={l.lane} className="row gap-2" style={{ flexShrink: 0 }}>
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: 2,
              background: laneColor(l.lane),
            }}
          />
          <span className="mono" style={{ fontSize: 11, color: "var(--text-2)" }}>
            {l.name}
          </span>
        </div>
      ))}
    </div>
  );
}

function RowGraph({
  row,
  width,
  isLast,
}: {
  row: RowLayout;
  width: number;
  isLast: boolean;
}) {
  const H = ROW_H;
  const cx = row.lane * LANE_W + 14;
  const cy = H / 2;
  const isMerge = row.commit.parents.length >= 2;
  const lines: React.ReactNode[] = [];

  row.preLanes.forEach((hash, i) => {
    if (!hash) return;
    const x = i * LANE_W + 14;
    lines.push(
      <line
        key={`pre-${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={cy}
        stroke={laneColor(i)}
        strokeWidth={1.5}
        opacity={0.85}
      />,
    );
  });

  row.postLanes.forEach((hash, i) => {
    if (!hash || isLast) return;
    if (i === row.lane) return;
    const x = i * LANE_W + 14;
    lines.push(
      <line
        key={`post-through-${i}`}
        x1={x}
        y1={cy}
        x2={x}
        y2={H}
        stroke={laneColor(i)}
        strokeWidth={1.5}
        opacity={0.85}
      />,
    );
  });

  row.commit.parents.forEach((_p, pi) => {
    const plane = row.parentLanes[pi];
    if (plane == null) return;
    if (isLast) return;
    const tx = plane * LANE_W + 14;
    if (tx === cx) {
      lines.push(
        <line
          key={`fp-${pi}`}
          x1={cx}
          y1={cy}
          x2={tx}
          y2={H}
          stroke={laneColor(plane)}
          strokeWidth={1.5}
          opacity={0.9}
        />,
      );
    } else {
      lines.push(
        <path
          key={`merge-${pi}`}
          d={`M ${cx},${cy} C ${cx},${H} ${tx},${cy} ${tx},${H}`}
          stroke={laneColor(plane)}
          strokeWidth={1.5}
          fill="none"
          opacity={0.9}
        />,
      );
    }
  });

  return (
    <svg width={width} height={H} style={{ flexShrink: 0 }}>
      {lines}
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={isMerge ? "var(--bg-1)" : laneColor(row.lane)}
        stroke={laneColor(row.lane)}
        strokeWidth={2}
      />
    </svg>
  );
}

function RowMeta({ row }: { row: RowLayout }) {
  const c = row.commit;
  return (
    <div className="row" style={{ flex: 1, minWidth: 0, gap: 10, padding: "0 14px" }}>
      <Avatar author={c.authorName} size={22} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="row gap-2" style={{ marginBottom: 2 }}>
          {c.refs.map((r) => (
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
            {c.subject}
          </span>
        </div>
        <div className="row gap-2" style={{ fontSize: 11, color: "var(--text-3)" }}>
          <span>{c.authorName}</span>
          <span style={{ color: "var(--text-4)" }}>·</span>
          <span>{c.date}</span>
          <span style={{ color: "var(--text-4)" }}>·</span>
          <span className="mono" style={{ color: "var(--text-4)" }}>
            {c.shortHash}
          </span>
        </div>
      </div>
      <div className="row gap-3 mono" style={{ fontSize: 10.5 }}>
        <span style={{ color: "var(--add-fg)" }}>+{c.stats.a}</span>
        <span style={{ color: "var(--del-fg)" }}>−{c.stats.d}</span>
      </div>
    </div>
  );
}
