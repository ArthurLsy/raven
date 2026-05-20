import * as React from "react";
import { Icons, type IconComponent } from "@/lib/icons";
import { useRepoStore, type View } from "@/features/repository/repository.store";
import { useTweaks } from "@/features/tweaks/tweaks.store";
import logoUrl from "@/assets/logo.png";

type Item = {
  k: View;
  I: IconComponent;
  label: string;
  badge?: number;
};

export function IconRail() {
  const view = useRepoStore((s) => s.view);
  const setView = useRepoStore((s) => s.setView);
  const status = useRepoStore((s) => s.status);
  const theme = useTweaks((s) => s.theme);
  const setTheme = useTweaks((s) => s.set);

  const changesCount = status?.files.length ?? 0;

  const items: Item[] = [
    { k: "changes", I: Icons.Changes, label: "Changes", badge: changesCount || undefined },
    { k: "history", I: Icons.History, label: "History" },
    { k: "graph", I: Icons.Graph, label: "Graph" },
    { k: "branches", I: Icons.GitBranch, label: "Branches" },
    { k: "stash", I: Icons.Stash, label: "Stash" },
  ];

  return (
    <div
      className="col"
      style={{
        width: 56,
        background: "var(--bg-0)",
        borderRight: "1px solid var(--border)",
        padding: "10px 0",
        alignItems: "center",
        gap: 4,
        flexShrink: 0,
      }}
    >
      <img
        src={logoUrl}
        alt="Git Client"
        draggable={false}
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          objectFit: "cover",
          marginBottom: 10,
          boxShadow:
            "0 4px 12px color-mix(in oklch, var(--accent) 30%, transparent), var(--inset)",
        }}
      />

      {items.map((it) => (
        <RailButton
          key={it.k}
          item={it}
          active={view === it.k}
          onClick={() => setView(it.k)}
        />
      ))}

      <div style={{ flex: 1 }} />

      <RailIconButton
        title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        onClick={() => setTheme("theme", theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Icons.Sun size={15} /> : <Icons.Moon size={15} />}
      </RailIconButton>
      <RailIconButton title="Settings">
        <Icons.Settings size={15} />
      </RailIconButton>
    </div>
  );
}

function RailButton({
  item,
  active,
  onClick,
}: {
  item: Item;
  active: boolean;
  onClick: () => void;
}) {
  const I = item.I;
  return (
    <button
      onClick={onClick}
      title={item.label}
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        position: "relative",
        display: "grid",
        placeItems: "center",
        color: active ? "var(--text)" : "var(--text-3)",
        background: active ? "var(--bg-3)" : "transparent",
        border: active ? "1px solid var(--border-2)" : "1px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--hover)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            left: -10,
            top: 8,
            bottom: 8,
            width: 2,
            background: "var(--accent)",
            borderRadius: 1,
          }}
        />
      )}
      <I size={16} />
      {item.badge != null && item.badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            minWidth: 14,
            height: 14,
            padding: "0 3px",
            borderRadius: 7,
            background: "var(--accent)",
            color: "var(--accent-fg)",
            fontSize: 9,
            fontWeight: 700,
            display: "grid",
            placeItems: "center",
            lineHeight: 1,
            border: "1.5px solid var(--bg-0)",
          }}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

function RailIconButton({
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
        width: 36,
        height: 36,
        borderRadius: 8,
        display: "grid",
        placeItems: "center",
        color: "var(--text-3)",
      }}
    >
      {children}
    </button>
  );
}
