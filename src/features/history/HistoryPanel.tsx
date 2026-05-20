import { useEffect, useState } from "react";
import { api, errorMessage, type CommitSummary } from "@/lib/tauri";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelativeDate } from "@/lib/format";
import { useRepoStore } from "../repository/repository.store";

export function HistoryPanel() {
  const repo = useRepoStore((s) => s.repo);
  const setError = useRepoStore((s) => s.setError);
  const [commits, setCommits] = useState<CommitSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!repo) return;
    let cancelled = false;
    setLoading(true);
    api
      .getCommitHistory(repo.rootPath, 100)
      .then((c) => {
        if (!cancelled) setCommits(c);
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
  }, [repo, setError]);

  if (!repo) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          History
        </h2>
        {loading && <span className="text-xs text-muted-foreground">Loading...</span>}
      </div>
      <ScrollArea className="flex-1">
        <ul className="divide-y">
          {commits.map((c) => (
            <li key={c.hash} className="px-3 py-2 text-sm hover:bg-muted/40">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs text-muted-foreground">{c.shortHash}</span>
                <span className="flex-1 truncate">{c.subject}</span>
                <span className="text-xs text-muted-foreground">{formatRelativeDate(c.date)}</span>
              </div>
              <div className="text-xs text-muted-foreground">{c.authorName}</div>
            </li>
          ))}
          {commits.length === 0 && !loading && (
            <li className="px-3 py-6 text-sm text-muted-foreground">No commits</li>
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}
