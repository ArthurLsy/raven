import { useMemo, useState } from "react";
import { GitCommit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/tauri";
import { useRepoStore } from "../repository/repository.store";

export function CommitPanel() {
  const repo = useRepoStore((s) => s.repo);
  const status = useRepoStore((s) => s.status);
  const refreshStatus = useRepoStore((s) => s.refreshStatus);
  const setError = useRepoStore((s) => s.setError);

  const [message, setMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const stagedCount = useMemo(
    () => status?.files.filter((f) => f.staged && !f.conflicted).length ?? 0,
    [status],
  );

  const canCommit = repo && stagedCount > 0 && message.trim().length > 0 && !committing;

  async function handleCommit() {
    if (!repo || !canCommit) return;
    setCommitting(true);
    setLastResult(null);
    try {
      const result = await api.createCommit(repo.rootPath, message);
      setLastResult(result.summary);
      setMessage("");
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCommitting(false);
    }
  }

  if (!repo) return null;

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Commit
        </h3>
        <span className="text-xs text-muted-foreground">
          {stagedCount} staged
        </span>
      </div>
      <Textarea
        placeholder="Commit message (required)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="flex-1 resize-none font-mono text-xs"
      />
      <div className="flex items-center justify-between gap-2">
        {lastResult && (
          <span className="truncate text-xs text-muted-foreground">{lastResult}</span>
        )}
        <Button
          onClick={handleCommit}
          disabled={!canCommit}
          className="ml-auto"
          size="sm"
        >
          <GitCommit className="size-4" />
          {committing ? "Committing..." : `Commit to ${repo.currentBranch ?? "HEAD"}`}
        </Button>
      </div>
    </div>
  );
}
