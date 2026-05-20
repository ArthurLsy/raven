import { Icons } from "@/lib/icons";

export function RefChip({ name }: { name: string }) {
  // "HEAD -> main" → show "main" as HEAD-style; "origin/main" → remote; "tag: v1" → tag.
  let label = name;
  let kind: "head" | "branch" | "remote" | "tag" = "branch";

  if (name.startsWith("HEAD -> ")) {
    kind = "head";
    label = name.slice("HEAD -> ".length);
  } else if (name === "HEAD") {
    kind = "head";
  } else if (name.startsWith("tag: ")) {
    kind = "tag";
    label = name.slice("tag: ".length);
  } else if (name.includes("/")) {
    kind = "remote";
  }

  const styles: Record<typeof kind, React.CSSProperties> = {
    head: {
      background: "var(--accent)",
      color: "var(--accent-fg)",
      border: "1px solid var(--accent-2)",
    },
    branch: {
      background: "var(--accent-soft)",
      color: "var(--accent)",
      border: "1px solid var(--accent-line)",
    },
    remote: {
      background: "var(--bg-3)",
      color: "var(--text-3)",
      border: "1px solid var(--border-2)",
    },
    tag: {
      background: "color-mix(in oklch, var(--tone-amber) 18%, transparent)",
      color: "var(--tone-amber)",
      border: "1px solid color-mix(in oklch, var(--tone-amber) 40%, transparent)",
    },
  };

  return (
    <span
      className="row gap-1 mono"
      style={{
        padding: "1px 6px 1px 5px",
        borderRadius: 4,
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: 0,
        whiteSpace: "nowrap",
        flexShrink: 0,
        ...styles[kind],
      }}
    >
      {kind === "head" ? (
        <span style={{ fontSize: 8 }}>●</span>
      ) : kind === "tag" ? (
        <Icons.Diamond size={9} />
      ) : (
        <Icons.GitBranch size={9} />
      )}
      {label}
    </span>
  );
}
