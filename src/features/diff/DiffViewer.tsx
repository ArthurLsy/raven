import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { api, errorMessage, type FileDiff } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import { useRepoStore } from "../repository/repository.store";

export function DiffViewer() {
  const repo = useRepoStore((s) => s.repo);
  const selected = useRepoStore((s) => s.selectedFile);
  const [diff, setDiff] = useState<FileDiff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!repo || !selected) {
      setDiff(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .getFileDiff(repo.rootPath, selected.filePath, selected.staged)
      .then((d) => {
        if (cancelled) return;
        setDiff(d);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(errorMessage(e));
        setDiff(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repo, selected]);

  if (!selected) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <FileText className="size-8 opacity-40" />
        <p>Select a file to see its diff</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="font-mono text-xs">
          <span className="text-muted-foreground">{selected.staged ? "staged" : "unstaged"} · </span>
          {selected.filePath}
        </div>
        {loading && <span className="text-xs text-muted-foreground">Loading...</span>}
      </div>
      {error ? (
        <div className="p-4 text-sm text-destructive">{error}</div>
      ) : diff?.isBinary ? (
        <div className="p-4 text-sm text-muted-foreground">Binary file</div>
      ) : (
        <pre className="flex-1 overflow-auto bg-background p-0 font-mono text-xs leading-relaxed">
          {renderDiff(diff?.diff ?? "")}
        </pre>
      )}
    </div>
  );
}

function renderDiff(text: string) {
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    let className = "px-3 whitespace-pre";
    if (line.startsWith("+++") || line.startsWith("---")) {
      className = cn(className, "text-muted-foreground");
    } else if (line.startsWith("@@")) {
      className = cn(className, "text-blue-400 bg-muted/40");
    } else if (line.startsWith("+")) {
      className = cn(className, "bg-diffAdd/40");
    } else if (line.startsWith("-")) {
      className = cn(className, "bg-diffDel/40");
    } else if (line.startsWith("diff ") || line.startsWith("index ")) {
      className = cn(className, "text-muted-foreground");
    }
    return (
      <div key={idx} className={className}>
        {line || " "}
      </div>
    );
  });
}
