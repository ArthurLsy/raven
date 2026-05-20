import type { CSSProperties } from "react";

const MAP: Record<string, { color: string; text: string; title: string }> = {
  modified: { color: "var(--status-mod)", text: "M", title: "Modified" },
  added: { color: "var(--status-add)", text: "A", title: "Added" },
  deleted: { color: "var(--status-del)", text: "D", title: "Deleted" },
  renamed: { color: "var(--status-new)", text: "R", title: "Renamed" },
  copied: { color: "var(--status-new)", text: "C", title: "Copied" },
  typechange: { color: "var(--status-mod)", text: "T", title: "Type change" },
  untracked: { color: "var(--status-new)", text: "?", title: "Untracked" },
  conflicted: { color: "var(--status-del)", text: "!", title: "Conflicted" },
  M: { color: "var(--status-mod)", text: "M", title: "Modified" },
  A: { color: "var(--status-add)", text: "A", title: "Added" },
  D: { color: "var(--status-del)", text: "D", title: "Deleted" },
  R: { color: "var(--status-new)", text: "R", title: "Renamed" },
  "??": { color: "var(--status-new)", text: "?", title: "Untracked" },
};

export function StatusGlyph({
  status,
  size = 18,
}: {
  status: string;
  size?: number;
}) {
  const m = MAP[status] ?? MAP.M;
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: 5,
    border: `1px solid ${m.color}`,
    background: `color-mix(in oklch, ${m.color} 18%, transparent)`,
    color: m.color,
    display: "grid",
    placeItems: "center",
    fontSize: Math.round(size * 0.55),
    fontWeight: 700,
    flexShrink: 0,
  };
  return (
    <div
      title={m.title}
      className="mono"
      style={style}
    >
      {m.text}
    </div>
  );
}
