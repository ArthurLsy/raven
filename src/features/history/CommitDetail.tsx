import * as React from "react";
import { Icons } from "@/lib/icons";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { api, errorMessage, type CommitFile, type CommitSummary } from "@/lib/tauri";
import { useRepoStore } from "@/features/repository/repository.store";
import { Avatar } from "./Avatar";
import { RefChip } from "./RefChip";

export function CommitDetail({ commit }: { commit: CommitSummary | null }) {
  const repo = useRepoStore((s) => s.repo);
  const setError = useRepoStore((s) => s.setError);
  const [files, setFiles] = React.useState<CommitFile[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!repo || !commit) {
      setFiles([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .getCommitFiles(repo.rootPath, commit.hash)
      .then((f) => {
        if (!cancelled) setFiles(f);
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
  }, [repo, commit, setError]);

  if (!commit) {
    return (
      <div
        className="col"
        style={{
          flex: 1,
          background: "var(--bg-0)",
          color: "var(--text-3)",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <Icons.GitCommit size={26} stroke="var(--text-4)" />
        <div style={{ fontSize: 13 }}>Select a commit to view details</div>
      </div>
    );
  }

  const total = commit.stats.a + commit.stats.d || 1;

  return (
    <div
      className="col"
      style={{ flex: 1, minHeight: 0, background: "var(--bg-0)" }}
    >
      <div
        style={{
          padding: "18px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-1)",
        }}
      >
        <div className="row gap-2" style={{ marginBottom: 8, flexWrap: "wrap" }}>
          {commit.refs.map((r) => (
            <RefChip key={r} name={r} />
          ))}
          <div style={{ flex: 1 }} />
          <button
            className="row gap-1"
            onClick={() => navigator.clipboard?.writeText(commit.hash)}
            title="Copy hash"
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              background: "var(--bg-2)",
              border: "1px solid var(--border-2)",
              color: "var(--text-2)",
              fontSize: 11,
            }}
          >
            <Icons.Copy size={11} />
            <span className="mono">{commit.shortHash}</span>
          </button>
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            color: "var(--text)",
            fontWeight: 600,
            letterSpacing: -0.3,
            lineHeight: 1.3,
          }}
        >
          {commit.subject}
        </h2>
        {commit.body && (
          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "var(--text-2)",
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
            }}
          >
            {commit.body}
          </p>
        )}
        <div className="row gap-3" style={{ marginTop: 12 }}>
          <div className="row gap-2">
            <Avatar author={commit.authorName} size={24} />
            <div>
              <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>
                {commit.authorName}
              </div>
              <div
                className="mono"
                style={{ fontSize: 10.5, color: "var(--text-4)" }}
              >
                {commit.authorEmail}
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{commit.date}</div>
            <div
              className="mono"
              style={{ fontSize: 10.5, color: "var(--text-4)" }}
            >
              parent {commit.parents[0]?.slice(0, 7) ?? "—"}
              {commit.parents[1] ? ` + ${commit.parents[1].slice(0, 7)}` : ""}
            </div>
          </div>
        </div>
      </div>

      <div
        className="row"
        style={{
          padding: "10px 20px",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--border)",
          gap: 16,
          fontSize: 11.5,
        }}
      >
        <span className="row gap-1">
          <Icons.File size={11} stroke="var(--text-3)" />
          <span className="mono" style={{ color: "var(--text-2)" }}>
            {commit.stats.f || files.length}
          </span>
          <span style={{ color: "var(--text-3)" }}>files</span>
        </span>
        <span className="mono" style={{ color: "var(--add-fg)" }}>+{commit.stats.a}</span>
        <span className="mono" style={{ color: "var(--del-fg)" }}>−{commit.stats.d}</span>
        <div
          style={{
            height: 6,
            flex: 1,
            maxWidth: 200,
            background: "var(--bg-3)",
            borderRadius: 999,
            overflow: "hidden",
            display: "flex",
          }}
        >
          <div
            style={{
              width: `${(commit.stats.a / total) * 100}%`,
              background: "var(--add-fg)",
            }}
          />
          <div
            style={{
              width: `${(commit.stats.d / total) * 100}%`,
              background: "var(--del-fg)",
            }}
          />
        </div>
        <div style={{ flex: 1 }} />
        <button
          className="row gap-1"
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            background: "var(--bg-3)",
            border: "1px solid var(--border-2)",
            color: "var(--text-2)",
            fontSize: 11,
          }}
        >
          <Icons.GitMerge size={11} />
          Revert
        </button>
        <button
          className="row gap-1"
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            background: "var(--accent-soft)",
            border: "1px solid var(--accent-line)",
            color: "var(--accent)",
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          <Icons.Wand size={11} />
          Explain with AI
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
        {loading ? (
          <div style={{ padding: 24, fontSize: 12, color: "var(--text-3)" }}>Loading…</div>
        ) : files.length === 0 ? (
          <div
            style={{ padding: 24, fontSize: 12, color: "var(--text-3)", textAlign: "center" }}
          >
            No file changes
          </div>
        ) : (
          files.map((f, i) => <CommitFileRow key={i} file={f} />)
        )}
      </div>
    </div>
  );
}

function CommitFileRow({ file }: { file: CommitFile }) {
  const parts = file.path.split("/");
  const name = parts.pop() ?? file.path;
  const dir = parts.join("/");
  const total = file.a + file.d || 1;
  return (
    <div
      className="row"
      style={{ padding: "8px 20px", gap: 10 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <StatusGlyph status={file.status} size={16} />
      <span
        className="mono"
        style={{
          flex: 1,
          fontSize: 12,
          color: "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: -0.1,
        }}
      >
        {dir && <span style={{ color: "var(--text-4)" }}>{dir}/</span>}
        <span>{name}</span>
      </span>
      <span className="mono" style={{ fontSize: 11, color: "var(--add-fg)" }}>+{file.a}</span>
      <span className="mono" style={{ fontSize: 11, color: "var(--del-fg)" }}>−{file.d}</span>
      <div
        style={{
          height: 5,
          width: 50,
          background: "var(--bg-3)",
          borderRadius: 999,
          overflow: "hidden",
          display: "flex",
        }}
      >
        <div style={{ width: `${(file.a / total) * 100}%`, background: "var(--add-fg)" }} />
        <div style={{ width: `${(file.d / total) * 100}%`, background: "var(--del-fg)" }} />
      </div>
    </div>
  );
}
