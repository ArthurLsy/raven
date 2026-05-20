import * as React from "react";
import { Icons } from "@/lib/icons";
import { Kbd } from "@/components/ui/kbd";
import { useRepoStore } from "@/features/repository/repository.store";

type Suggestion = {
  type: string;
  scope: string;
  subject: string;
  body: string;
  confidence: number;
  files: number;
};

const SUGGESTIONS: Suggestion[] = [
  {
    type: "feat",
    scope: "ui",
    subject: "compose changes around grouped categories and AI assist",
    body: "Auto-groups the working tree into Source, Content, Styles, Dependencies and Docs. Adds a Linear-style commit composer with conventional commit prefix, body toggle and ⌘J AI compose modal.",
    confidence: 0.92,
    files: 4,
  },
  {
    type: "refactor",
    scope: "diff",
    subject: "render diffs as structured hunks with per-hunk staging",
    body: "Replaces the raw text diff with a parsed Hunk[] model, including line numbers, syntax tinting and Stage / Unstage hunk buttons wired to git apply --cached.",
    confidence: 0.81,
    files: 3,
  },
  {
    type: "chore",
    scope: "tokens",
    subject: "switch to OKLCH design tokens with Geist typography",
    body: "Replaces the HSL palette with the design bundle's OKLCH tokens (dark + light) and pulls in Geist Sans / Geist Mono via @fontsource.",
    confidence: 0.58,
    files: 2,
  },
];

export function AISuggestModal() {
  const open = useRepoStore((s) => s.aiOpen);
  const setOpen = useRepoStore((s) => s.setAiOpen);
  const applySuggestion = useRepoStore((s) => s.applySuggestion);
  const [hovered, setHovered] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowDown") {
        setHovered((h) => Math.min(h + 1, SUGGESTIONS.length - 1));
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        setHovered((h) => Math.max(h - 1, 0));
        e.preventDefault();
      } else if (e.key === "Enter") {
        const s = SUGGESTIONS[hovered];
        if (s) applySuggestion(s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hovered, setOpen, applySuggestion]);

  if (!open) return null;

  return (
    <div
      className="fade-in"
      onClick={() => setOpen(false)}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="slide-up"
        style={{
          width: 560,
          background: "var(--bg-1)",
          border: "1px solid var(--border-2)",
          borderRadius: 14,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
      >
        <div
          className="row"
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--accent-soft)",
              border: "1px solid var(--accent-line)",
              display: "grid",
              placeItems: "center",
              color: "var(--accent)",
            }}
          >
            <Icons.Sparkles size={14} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              AI commit suggestions
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
              Based on your staged changes — pick one to insert
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="hover-bg"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              color: "var(--text-3)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icons.X size={14} />
          </button>
        </div>
        <div
          style={{
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => applySuggestion(s)}
              onMouseEnter={() => setHovered(i)}
              style={{
                textAlign: "left",
                padding: 12,
                borderRadius: 9,
                background: hovered === i ? "var(--accent-soft)" : "var(--bg-2)",
                border: `1px solid ${
                  hovered === i ? "var(--accent-line)" : "var(--border)"
                }`,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div className="row gap-2">
                <span
                  className="mono"
                  style={{
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "var(--bg-3)",
                    color: "var(--text-2)",
                    fontSize: 10.5,
                    fontWeight: 600,
                  }}
                >
                  {s.type}({s.scope})
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text)",
                    fontWeight: 500,
                    flex: 1,
                  }}
                >
                  {s.subject}
                </span>
                <ConfidenceBar v={s.confidence} />
              </div>
              <div
                style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.45 }}
              >
                {s.body}
              </div>
              <div className="row gap-2" style={{ marginTop: 2 }}>
                <span
                  className="mono"
                  style={{ fontSize: 10.5, color: "var(--text-4)" }}
                >
                  {s.files} file{s.files === 1 ? "" : "s"}
                </span>
                <span style={{ fontSize: 10.5, color: "var(--text-4)" }}>·</span>
                <span style={{ fontSize: 10.5, color: "var(--text-4)" }}>
                  {Math.round(s.confidence * 100)}% match
                </span>
                <div style={{ flex: 1 }} />
                <span
                  className="row gap-1"
                  style={{
                    color:
                      hovered === i ? "var(--accent)" : "var(--text-4)",
                    fontSize: 11,
                  }}
                >
                  Use this <Icons.Arrow size={11} />
                </span>
              </div>
            </button>
          ))}
        </div>
        <div
          className="row"
          style={{
            padding: "10px 14px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-2)",
            fontSize: 11,
            color: "var(--text-4)",
            gap: 12,
          }}
        >
          <span className="row gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="row gap-1">
            <Kbd>↵</Kbd> apply
          </span>
          <span className="row gap-1">
            <Kbd>esc</Kbd> dismiss
          </span>
          <div style={{ flex: 1 }} />
          <span>Powered by on-device summarization</span>
        </div>
      </div>
    </div>
  );
}

function ConfidenceBar({ v }: { v: number }) {
  const color =
    v > 0.8 ? "var(--add-fg)" : v > 0.5 ? "var(--status-mod)" : "var(--text-4)";
  return (
    <div className="row gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: 10,
            borderRadius: 1,
            background: v > i * 0.2 ? color : "var(--bg-3)",
          }}
        />
      ))}
    </div>
  );
}
