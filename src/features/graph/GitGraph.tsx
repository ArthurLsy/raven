import { useEffect, useMemo, useState } from "react";
import { api, errorMessage, type GraphCommit } from "@/lib/tauri";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRepoStore } from "../repository/repository.store";

const ROW_H = 28;
const LANE_W = 16;
const DOT_R = 5;
const LEFT_PAD = 12;

const LANE_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
  "#06b6d4", // cyan
];

const laneColor = (lane: number) => LANE_COLORS[lane % LANE_COLORS.length];

type RowLayout = {
  commit: GraphCommit;
  lane: number;
  preLanes: (string | null)[];
  postLanes: (string | null)[];
  parentLanes: number[]; // lane assigned to each parent (in c.parents order)
};

export function GitGraph() {
  const repo = useRepoStore((s) => s.repo);
  const setError = useRepoStore((s) => s.setError);
  const [commits, setCommits] = useState<GraphCommit[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!repo) return;
    let cancelled = false;
    api
      .getGraph(repo.rootPath, 300)
      .then((c) => {
        if (!cancelled) setCommits(c);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [repo, setError]);

  const { rows, maxLanes } = useMemo(() => buildLayout(commits), [commits]);
  const graphWidth = LEFT_PAD + maxLanes * LANE_W;

  if (!repo) return null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Graph
        </h2>
        <span className="text-xs text-muted-foreground">{rows.length} commits</span>
      </div>
      <ScrollArea className="flex-1">
        <ul className="select-none">
          {rows.map((row) => {
            const isSelected = selected === row.commit.hash;
            return (
              <li
                key={row.commit.hash}
                className={cn(
                  "flex items-center border-b border-border/40 text-sm cursor-pointer",
                  isSelected ? "bg-accent/40" : "hover:bg-muted/30",
                )}
                style={{ height: ROW_H }}
                onClick={() => setSelected(row.commit.hash)}
              >
                <RowGraph row={row} width={graphWidth} />
                <RowMeta row={row} />
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="px-3 py-6 text-sm text-muted-foreground">No commits</li>
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}

function RowGraph({ row, width }: { row: RowLayout; width: number }) {
  const H = ROW_H;
  const cx = LEFT_PAD + row.lane * LANE_W;
  const cy = H / 2;
  const isMerge = row.commit.parents.length >= 2;

  const lines: React.ReactNode[] = [];

  // Top half: incoming lines for every active lane in preLanes.
  row.preLanes.forEach((hash, i) => {
    if (!hash) return;
    const x = LEFT_PAD + i * LANE_W;
    lines.push(
      <line
        key={`top-${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={cy}
        stroke={laneColor(i)}
        strokeWidth={1.5}
      />,
    );
  });

  // Bottom half: through-lanes (non-commit lanes that continue past this row).
  row.postLanes.forEach((hash, i) => {
    if (!hash) return;
    if (i === row.lane) return; // handled by parent edges below
    const x = LEFT_PAD + i * LANE_W;
    lines.push(
      <line
        key={`bot-through-${i}`}
        x1={x}
        y1={cy}
        x2={x}
        y2={H}
        stroke={laneColor(i)}
        strokeWidth={1.5}
      />,
    );
  });

  // Bottom half: edges from this commit's dot to each of its parents.
  row.commit.parents.forEach((_p, pi) => {
    const plane = row.parentLanes[pi];
    if (plane == null) return;
    const tx = LEFT_PAD + plane * LANE_W;
    if (tx === cx) {
      lines.push(
        <line
          key={`bot-fp-${pi}`}
          x1={cx}
          y1={cy}
          x2={tx}
          y2={H}
          stroke={laneColor(plane)}
          strokeWidth={1.5}
        />,
      );
    } else {
      // Smooth S-curve from dot to target lane bottom.
      const c1x = cx;
      const c1y = H;
      const c2x = tx;
      const c2y = cy;
      lines.push(
        <path
          key={`bot-merge-${pi}`}
          d={`M ${cx},${cy} C ${c1x},${c1y} ${c2x},${c2y} ${tx},${H}`}
          stroke={laneColor(plane)}
          strokeWidth={1.5}
          fill="none"
        />,
      );
    }
  });

  return (
    <svg width={width} height={H} className="flex-none">
      {lines}
      <circle
        cx={cx}
        cy={cy}
        r={DOT_R}
        fill={isMerge ? "hsl(var(--background))" : laneColor(row.lane)}
        stroke={laneColor(row.lane)}
        strokeWidth={isMerge ? 2 : 1}
      />
    </svg>
  );
}

function RowMeta({ row }: { row: RowLayout }) {
  const c = row.commit;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
      <span className="font-mono text-[11px] text-muted-foreground">{c.shortHash}</span>
      {c.refs.map((ref) => (
        <RefBadge key={ref} ref_={ref} />
      ))}
      <span className="min-w-0 flex-1 truncate">{c.subject}</span>
      <span className="hidden md:inline truncate text-xs text-muted-foreground">
        {c.authorName}
      </span>
      <span className="text-xs text-muted-foreground">{formatRelativeDate(c.date)}</span>
    </div>
  );
}

function RefBadge({ ref_ }: { ref_: string }) {
  // refs look like: "HEAD -> main", "origin/main", "tag: v1.0"
  let label = ref_;
  let variant: "head" | "branch" | "remote" | "tag" = "branch";

  if (ref_.startsWith("HEAD -> ")) {
    variant = "head";
    label = ref_.slice("HEAD -> ".length);
  } else if (ref_ === "HEAD") {
    variant = "head";
  } else if (ref_.startsWith("tag: ")) {
    variant = "tag";
    label = ref_.slice("tag: ".length);
  } else if (ref_.includes("/")) {
    variant = "remote";
  }

  const styles: Record<typeof variant, string> = {
    head: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    branch: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    remote: "bg-muted text-muted-foreground border-border",
    tag: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };

  return (
    <span
      className={cn(
        "rounded-sm border px-1.5 py-px text-[10px] font-medium leading-tight",
        styles[variant],
      )}
    >
      {label}
    </span>
  );
}

function buildLayout(commits: GraphCommit[]): {
  rows: RowLayout[];
  maxLanes: number;
} {
  const rows: RowLayout[] = [];
  const lanes: (string | null)[] = [];
  let maxLanes = 0;

  for (const c of commits) {
    const preLanes = [...lanes];

    // Find this commit's lane: existing reservation or first free slot.
    let lane = lanes.findIndex((h) => h === c.hash);
    if (lane === -1) {
      lane = lanes.findIndex((h) => h === null);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(null);
      }
    }

    // Free this slot — we'll repurpose it for the first parent.
    lanes[lane] = null;

    const parentLanes: number[] = [];

    c.parents.forEach((p, i) => {
      if (i === 0) {
        // First parent stays in the commit's lane.
        lanes[lane] = p;
        parentLanes.push(lane);
      } else {
        // Merge parents: reuse an existing reservation or find a free slot.
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

    // Trim trailing nulls so the graph naturally narrows after branches end.
    while (lanes.length > 0 && lanes[lanes.length - 1] == null) {
      lanes.pop();
    }

    const postLanes = [...lanes];
    maxLanes = Math.max(maxLanes, preLanes.length, postLanes.length, lane + 1);

    rows.push({
      commit: c,
      lane,
      preLanes,
      postLanes,
      parentLanes,
    });
  }

  return { rows, maxLanes };
}
