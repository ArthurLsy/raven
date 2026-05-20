import * as React from "react";
import { Icons } from "@/lib/icons";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { Kbd } from "@/components/ui/kbd";
import {
  api,
  errorMessage,
  type DiffLineDTO,
  type FileDiff,
  type GitFileStatus,
  type Hunk,
} from "@/lib/tauri";
import { useRepoStore } from "@/features/repository/repository.store";

const STATUS_FROM_KIND: Record<GitFileStatus["kind"], string> = {
  modified: "M",
  added: "A",
  deleted: "D",
  renamed: "R",
  copied: "C",
  typechange: "T",
  untracked: "??",
  conflicted: "M",
};

export function DiffViewer() {
  const repo = useRepoStore((s) => s.repo);
  const selected = useRepoStore((s) => s.selectedFile);
  const status = useRepoStore((s) => s.status);
  const [diff, setDiff] = React.useState<FileDiff | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [view, setView] = React.useState<"unified" | "split">("unified");
  const refreshStatus = useRepoStore((s) => s.refreshStatus);
  const setStoreError = useRepoStore((s) => s.setError);

  React.useEffect(() => {
    if (!repo || !selected) {
      setDiff(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getFileDiff(repo.rootPath, selected.filePath, selected.staged)
      .then((d) => {
        if (!cancelled) setDiff(d);
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
  }, [repo, selected, status]);

  if (!selected) {
    return (
      <div
        className="col"
        style={{
          flex: 1,
          background: "var(--bg-0)",
          color: "var(--text-3)",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: 32,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icons.File size={22} />
        </div>
        <div style={{ fontSize: 14, color: "var(--text-2)" }}>
          Select a file to see its diff
        </div>
        <div className="row gap-2" style={{ fontSize: 12, color: "var(--text-4)" }}>
          Or press <Kbd>⌘</Kbd> <Kbd>J</Kbd> to generate a commit message
        </div>
      </div>
    );
  }

  const file = status?.files.find((f) => f.path === selected.filePath);
  const statusChar = file ? STATUS_FROM_KIND[file.kind] : "M";

  return (
    <div
      className="col"
      style={{ flex: 1, background: "var(--bg-0)", overflow: "hidden", minWidth: 0 }}
    >
      <FileHeader
        path={selected.filePath}
        statusChar={statusChar}
        diff={diff}
        view={view}
        setView={setView}
      />
      <div style={{ flex: 1, overflow: "auto" }}>
        {error ? (
          <div style={{ padding: 24, color: "var(--del-fg)", fontSize: 12 }}>{error}</div>
        ) : loading && !diff ? (
          <div style={{ padding: 24, color: "var(--text-3)", fontSize: 12 }}>Loading…</div>
        ) : diff?.isBinary ? (
          <div style={{ padding: 32, color: "var(--text-3)", fontSize: 12, textAlign: "center" }}>
            <div className="mono" style={{ color: "var(--text-2)", marginBottom: 10 }}>
              Binary or large file — preview disabled
            </div>
          </div>
        ) : !diff || diff.hunks.length === 0 ? (
          <div style={{ padding: 32, color: "var(--text-3)", fontSize: 12, textAlign: "center" }}>
            No changes to display.
          </div>
        ) : (
          diff.hunks.map((h, i) => (
            <HunkBlock
              key={i}
              hunk={h}
              filePath={selected.filePath}
              repoPath={repo!.rootPath}
              staged={selected.staged}
              onChanged={async () => {
                await refreshStatus();
                try {
                  const fresh = await api.getFileDiff(
                    repo!.rootPath,
                    selected.filePath,
                    selected.staged,
                  );
                  setDiff(fresh);
                } catch (e) {
                  setStoreError(errorMessage(e));
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FileHeader({
  path,
  statusChar,
  diff,
  view,
  setView,
}: {
  path: string;
  statusChar: string;
  diff: FileDiff | null;
  view: "unified" | "split";
  setView: (v: "unified" | "split") => void;
}) {
  const additions = diff?.additions ?? 0;
  const deletions = diff?.deletions ?? 0;
  const total = additions + deletions;
  const addsRatio = total > 0 ? additions / total : 0;

  return (
    <div
      style={{
        padding: "16px 18px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-1)",
      }}
    >
      <div className="row gap-3" style={{ marginBottom: 10 }}>
        <StatusGlyph status={statusChar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="mono"
            style={{
              fontSize: 13.5,
              color: "var(--text)",
              letterSpacing: -0.1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {path.split("/").map((seg, i, arr) => (
              <span key={i}>
                <span
                  style={{
                    color: i === arr.length - 1 ? "var(--text)" : "var(--text-3)",
                  }}
                >
                  {seg}
                </span>
                {i < arr.length - 1 && (
                  <span style={{ color: "var(--text-4)", margin: "0 4px" }}>/</span>
                )}
              </span>
            ))}
          </div>
        </div>
        <div className="row gap-3" style={{ color: "var(--text-3)", fontSize: 11.5 }}>
          <span className="mono" style={{ color: "var(--add-fg)" }}>+{additions}</span>
          <span className="mono" style={{ color: "var(--del-fg)" }}>−{deletions}</span>
          <div
            style={{
              display: "flex",
              height: 6,
              width: 80,
              borderRadius: 999,
              overflow: "hidden",
              background: "var(--bg-3)",
            }}
          >
            <div style={{ width: `${addsRatio * 100}%`, background: "var(--add-fg)" }} />
            <div
              style={{
                width: `${(1 - addsRatio) * 100}%`,
                background: "var(--del-fg)",
              }}
            />
          </div>
        </div>
      </div>
      <div className="row" style={{ marginTop: 2, justifyContent: "flex-end" }}>
        <div
          className="row"
          style={{
            background: "var(--bg-3)",
            padding: 2,
            borderRadius: 7,
            border: "1px solid var(--border)",
          }}
        >
          {(["unified", "split"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setView(k)}
              style={{
                padding: "3px 9px",
                fontSize: 11,
                fontWeight: 500,
                background: view === k ? "var(--bg-1)" : "transparent",
                color: view === k ? "var(--text)" : "var(--text-3)",
                borderRadius: 5,
                border:
                  view === k ? "1px solid var(--border-2)" : "1px solid transparent",
                boxShadow: view === k ? "var(--shadow-sm)" : "none",
                textTransform: "capitalize",
              }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HunkBlock({
  hunk,
  filePath,
  repoPath,
  staged,
  onChanged,
}: {
  hunk: Hunk;
  filePath: string;
  repoPath: string;
  staged: boolean;
  onChanged: () => Promise<void>;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const setError = useRepoStore((s) => s.setError);

  const adds = hunk.lines.filter((l) => l.t === "add").length;
  const dels = hunk.lines.filter((l) => l.t === "del").length;
  const summary = `Lines ${hunk.newStart}–${hunk.newStart + hunk.newCount - 1}`;

  async function toggleStage() {
    setBusy(true);
    try {
      if (staged) {
        await api.unstageHunk(repoPath, filePath, hunk.rawText);
      } else {
        await api.stageHunk(repoPath, filePath, hunk.rawText);
      }
      await onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-1)" }}>
      <div
        className="row"
        style={{
          padding: "8px 14px",
          gap: 10,
          background: "var(--bg-2)",
          borderBottom: expanded ? "1px solid var(--border)" : "none",
          userSelect: "none",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <Icons.ChevronD
          size={11}
          style={{
            transform: expanded ? "rotate(0)" : "rotate(-90deg)",
            transition: "transform 150ms",
            color: "var(--text-3)",
          }}
        />
        <span className="mono" style={{ color: "var(--text-3)", fontSize: 11 }}>
          {hunk.header}
        </span>
        <span style={{ color: "var(--text-2)", fontSize: 12 }}>·</span>
        <span style={{ color: "var(--text-2)", fontSize: 12, flex: 1 }}>{summary}</span>
        <span className="mono" style={{ color: "var(--add-fg)", fontSize: 11 }}>+{adds}</span>
        <span className="mono" style={{ color: "var(--del-fg)", fontSize: 11 }}>−{dels}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleStage();
          }}
          disabled={busy}
          title={staged ? "Unstage hunk" : "Stage hunk"}
          className="row gap-2"
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            background: staged ? "var(--accent-soft)" : "transparent",
            border: `1px solid ${staged ? "var(--accent-line)" : "var(--border-2)"}`,
            color: staged ? "var(--accent)" : "var(--text-2)",
            fontSize: 11,
            fontWeight: 500,
            opacity: busy ? 0.5 : 1,
          }}
        >
          {staged ? <Icons.Check size={11} /> : <Icons.Plus size={11} />}
          {staged ? "Unstage" : "Stage hunk"}
        </button>
      </div>
      {expanded && (
        <div className="fade-in">
          {hunk.lines.map((l, i) => (
            <DiffLine key={i} line={l} />
          ))}
        </div>
      )}
    </div>
  );
}

const TOKEN_COLORS: Record<string, string> = {
  com: "var(--text-4)",
  kw: "color-mix(in oklch, var(--accent) 75%, var(--text))",
  str: "var(--tone-amber)",
  type: "var(--tone-cyan)",
  punc: "var(--text-3)",
  ident: "var(--text)",
  ws: "inherit",
};

const KEYWORDS = new Set([
  "import",
  "export",
  "from",
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "async",
  "await",
  "class",
  "new",
  "default",
  "in",
  "of",
  "as",
  "true",
  "false",
  "null",
  "undefined",
  "pub",
  "fn",
  "mut",
  "use",
  "mod",
  "struct",
  "enum",
  "impl",
  "match",
  "for",
  "while",
  "loop",
  "self",
  "Self",
]);

function tokenize(line: string): { s: string; k?: string }[] {
  if (!line) return [{ s: " " }];
  const out: { s: string; k?: string }[] = [];
  let rest = line;
  let safety = 5000;
  while (rest.length && safety-- > 0) {
    let m: RegExpExecArray | null;
    if ((m = /^(\s*)(\/\/.*$)/.exec(rest))) {
      out.push({ s: m[1], k: "ws" });
      out.push({ s: m[2], k: "com" });
      rest = rest.slice(m[0].length);
      continue;
    }
    if ((m = /^('[^']*'|"[^"]*"|`[^`]*`)/.exec(rest))) {
      out.push({ s: m[1], k: "str" });
      rest = rest.slice(m[0].length);
      continue;
    }
    if ((m = /^(\s+)/.exec(rest))) {
      out.push({ s: m[1], k: "ws" });
      rest = rest.slice(m[0].length);
      continue;
    }
    if ((m = /^([{}\[\](),;.])/.exec(rest))) {
      out.push({ s: m[1], k: "punc" });
      rest = rest.slice(m[0].length);
      continue;
    }
    if ((m = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(rest))) {
      const k = KEYWORDS.has(m[1]) ? "kw" : /^[A-Z]/.test(m[1]) ? "type" : "ident";
      out.push({ s: m[1], k });
      rest = rest.slice(m[0].length);
      continue;
    }
    out.push({ s: rest[0] });
    rest = rest.slice(1);
  }
  return out;
}

function DiffLine({ line }: { line: DiffLineDTO }) {
  const isAdd = line.t === "add";
  const isDel = line.t === "del";
  const bg = isAdd ? "var(--add-bg)" : isDel ? "var(--del-bg)" : "transparent";
  const marker = isAdd ? "+" : isDel ? "−" : " ";
  const markerColor = isAdd
    ? "var(--add-fg)"
    : isDel
      ? "var(--del-fg)"
      : "var(--text-4)";
  const tokens = React.useMemo(() => tokenize(line.s || " "), [line.s]);
  return (
    <div
      className="mono"
      style={{
        display: "grid",
        gridTemplateColumns: "44px 44px 18px 1fr",
        alignItems: "center",
        background: bg,
        fontSize: 11.5,
        lineHeight: "20px",
        whiteSpace: "pre",
        minHeight: 20,
      }}
    >
      <span
        style={{
          color: "var(--text-4)",
          textAlign: "right",
          paddingRight: 8,
          userSelect: "none",
        }}
      >
        {line.n1 ?? ""}
      </span>
      <span
        style={{
          color: "var(--text-4)",
          textAlign: "right",
          paddingRight: 8,
          userSelect: "none",
        }}
      >
        {line.n2 ?? ""}
      </span>
      <span
        style={{
          color: markerColor,
          textAlign: "center",
          userSelect: "none",
          fontWeight: 600,
        }}
      >
        {marker}
      </span>
      <span style={{ paddingRight: 12 }}>
        {tokens.map((t, i) => (
          <span key={i} style={{ color: TOKEN_COLORS[t.k ?? ""] ?? "var(--text)" }}>
            {t.s}
          </span>
        ))}
      </span>
    </div>
  );
}
