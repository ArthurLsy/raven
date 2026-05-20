import * as React from "react";

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mono"
      style={{
        display: "inline-grid",
        placeItems: "center",
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        background: "var(--bg-2)",
        border: "1px solid var(--border-2)",
        borderRadius: 4,
        fontSize: 10.5,
        color: "var(--text-2)",
        verticalAlign: "middle",
      }}
    >
      {children}
    </span>
  );
}
