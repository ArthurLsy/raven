import * as React from "react";
import { Icons } from "@/lib/icons";
import { Kbd } from "@/components/ui/kbd";
import { api, errorMessage } from "@/lib/tauri";
import { useRepoStore } from "@/features/repository/repository.store";
import { useTweaks } from "@/features/tweaks/tweaks.store";

const TYPES = [
  "feat",
  "fix",
  "chore",
  "refactor",
  "docs",
  "test",
  "style",
  "perf",
  "wip",
] as const;

export function CommitComposer() {
  const repo = useRepoStore((s) => s.repo);
  const status = useRepoStore((s) => s.status);
  const refreshStatus = useRepoStore((s) => s.refreshStatus);
  const setError = useRepoStore((s) => s.setError);
  const setStatusMsg = useRepoStore((s) => s.setStatusMsg);
  const setAiOpen = useRepoStore((s) => s.setAiOpen);
  const pending = useRepoStore((s) => s.pendingSuggestion);
  const consumeSuggestion = useRepoStore((s) => s.consumeSuggestion);
  const aiAssist = useTweaks((s) => s.aiAssist);

  const [type, setType] = React.useState<string>("feat");
  const [scope, setScope] = React.useState<string>("");
  const [subject, setSubject] = React.useState<string>("");
  const [body, setBody] = React.useState<string>("");
  const [bodyOpen, setBodyOpen] = React.useState(false);
  const [typing, setTyping] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);

  // Typewriter effect when an AI suggestion is applied
  React.useEffect(() => {
    if (!pending) return;
    setType(pending.type);
    setScope(pending.scope);
    setBody(pending.body);
    setBodyOpen(true);
    setSubject("");
    setTyping(true);
    let i = 0;
    const iv = window.setInterval(() => {
      i += 2;
      setSubject(pending.subject.slice(0, i));
      if (i >= pending.subject.length) {
        window.clearInterval(iv);
        setTyping(false);
        consumeSuggestion();
      }
    }, 16);
    return () => window.clearInterval(iv);
  }, [pending, consumeSuggestion]);

  const stagedCount = React.useMemo(
    () => status?.files.filter((f) => f.staged && !f.conflicted).length ?? 0,
    [status],
  );

  const charLimit = 72;
  const charColor =
    subject.length > charLimit
      ? "var(--del-fg)"
      : subject.length > 50
        ? "var(--status-mod)"
        : "var(--text-4)";

  const fullMsg = `${type}${scope ? `(${scope})` : ""}: ${subject || "…"}`;
  const canCommit = !!subject.trim() && stagedCount > 0 && !typing && !committing && !!repo;

  async function handleCommit() {
    if (!repo || !canCommit) return;
    setCommitting(true);
    try {
      const message = body
        ? `${type}${scope ? `(${scope})` : ""}: ${subject}\n\n${body}`
        : `${type}${scope ? `(${scope})` : ""}: ${subject}`;
      const result = await api.createCommit(repo.rootPath, message);
      setStatusMsg(`✓ committed ${result.commitHash?.slice(0, 7) ?? ""} ${subject}`);
      setSubject("");
      setBody("");
      setBodyOpen(false);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCommitting(false);
    }
  }

  // ⌘↵ to commit
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "Enter" && canCommit) {
        e.preventDefault();
        handleCommit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!repo) return null;

  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--bg-1)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="row" style={{ padding: "10px 14px 6px", gap: 8 }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "var(--text-2)",
          }}
        >
          Commit
        </span>
        <span className="mono" style={{ color: "var(--text-4)", fontSize: 11 }}>
          {stagedCount} staged
        </span>
        <div style={{ flex: 1 }} />
        {aiAssist && (
          <button
            onClick={() => setAiOpen(true)}
            className="row gap-1"
            title="Generate commit (⌘J)"
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              color: "var(--accent)",
              background: "var(--accent-soft)",
              border: "1px solid var(--accent-line)",
              whiteSpace: "nowrap",
            }}
          >
            <Icons.Sparkles size={11} />
            AI compose
          </button>
        )}
      </div>

      <div className="row gap-2" style={{ padding: "4px 14px 6px" }}>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mono"
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border-2)",
            borderRadius: 5,
            padding: "2px 6px",
            fontSize: 11,
            color: "var(--text-2)",
            appearance: "none",
            paddingRight: 18,
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'><path fill='%237a7a85' d='M0 0h8L4 5z'/></svg>\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 5px center",
          }}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="mono" style={{ color: "var(--text-4)", fontSize: 11 }}>(</span>
        <input
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          placeholder="scope"
          className="mono"
          style={{
            background: "transparent",
            border: "1px solid var(--border-2)",
            borderRadius: 5,
            padding: "2px 6px",
            fontSize: 11,
            color: "var(--text-2)",
            width: 90,
          }}
        />
        <span className="mono" style={{ color: "var(--text-4)", fontSize: 11 }}>):</span>
        <div style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 10, color: charColor }}>
          {subject.length}/{charLimit}
        </span>
      </div>

      <div style={{ padding: "0 14px" }}>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Summary of the change"
          style={{
            width: "100%",
            background: "var(--bg-2)",
            border: `1px solid ${subject ? "var(--border-2)" : "var(--border)"}`,
            borderRadius: 7,
            padding: "8px 10px",
            fontSize: 13,
            color: "var(--text)",
            letterSpacing: -0.1,
          }}
        />
        {typing && (
          <div
            className="row gap-1"
            style={{ marginTop: 6, color: "var(--accent)", fontSize: 10.5 }}
          >
            <span
              className="pulse-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "var(--accent)",
              }}
            />
            AI is writing…
          </div>
        )}
      </div>

      <button
        onClick={() => setBodyOpen((v) => !v)}
        className="row gap-1"
        style={{
          padding: "8px 14px 4px",
          color: "var(--text-3)",
          fontSize: 11,
        }}
      >
        <Icons.ChevronD
          size={10}
          style={{
            transform: bodyOpen ? "rotate(0)" : "rotate(-90deg)",
            transition: "transform 150ms",
          }}
        />
        Description{" "}
        {body && <span style={{ color: "var(--text-4)" }}>· {body.length} chars</span>}
      </button>
      {bodyOpen && (
        <div style={{ padding: "0 14px 8px" }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Extended description (optional, supports markdown)…"
            rows={3}
            style={{
              width: "100%",
              resize: "none",
              background: "var(--bg-2)",
              border: "1px solid var(--border-2)",
              borderRadius: 7,
              padding: "8px 10px",
              fontSize: 12,
              color: "var(--text-2)",
              fontFamily: "inherit",
            }}
          />
        </div>
      )}

      <div
        className="row"
        style={{
          padding: "8px 14px 12px",
          gap: 10,
          borderTop: "1px solid var(--border)",
          background: "var(--bg-2)",
        }}
      >
        <div
          className="mono"
          title={fullMsg}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 11,
            color: "var(--text-3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {fullMsg}
        </div>
        <button
          onClick={canCommit ? handleCommit : undefined}
          disabled={!canCommit}
          className="row gap-2"
          style={{
            padding: "6px 10px",
            borderRadius: 7,
            background: canCommit ? "var(--accent)" : "var(--bg-3)",
            color: canCommit ? "var(--accent-fg)" : "var(--text-4)",
            fontSize: 12,
            fontWeight: 600,
            boxShadow: canCommit ? "var(--shadow-sm)" : "none",
            border: canCommit ? "1px solid var(--accent-2)" : "1px solid var(--border)",
            opacity: canCommit ? 1 : 0.7,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <Icons.GitCommit size={12} />
          {committing ? "Committing…" : "Commit"}
          <Kbd>⌘</Kbd>
          <Kbd>↵</Kbd>
        </button>
      </div>
    </div>
  );
}
