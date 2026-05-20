import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/tauri";
import { useRepoStore } from "../repository/repository.store";

type Op = "fetch" | "pull" | "push" | null;

export function RemoteActions() {
  const repo = useRepoStore((s) => s.repo);
  const refreshStatus = useRepoStore((s) => s.refreshStatus);
  const setError = useRepoStore((s) => s.setError);
  const status = useRepoStore((s) => s.status);

  const [busy, setBusy] = useState<Op>(null);

  if (!repo) return null;

  async function run(op: NonNullable<Op>) {
    if (!repo) return;
    setBusy(op);
    try {
      if (op === "fetch") await api.fetch(repo.rootPath);
      if (op === "pull") await api.pull(repo.rootPath);
      if (op === "push") await api.push(repo.rootPath);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const ahead = status?.ahead ?? 0;
  const behind = status?.behind ?? 0;

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={busy !== null}
        onClick={() => run("fetch")}
        title="git fetch --prune"
      >
        <RefreshCw className={busy === "fetch" ? "size-4 animate-spin" : "size-4"} />
        Fetch
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy !== null}
        onClick={() => run("pull")}
        title="git pull"
      >
        <ArrowDownToLine className={busy === "pull" ? "size-4 animate-spin" : "size-4"} />
        Pull {behind > 0 ? <span className="text-xs text-muted-foreground">({behind})</span> : null}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy !== null}
        onClick={() => run("push")}
        title="git push"
      >
        <ArrowUpFromLine className={busy === "push" ? "size-4 animate-spin" : "size-4"} />
        Push {ahead > 0 ? <span className="text-xs text-muted-foreground">({ahead})</span> : null}
      </Button>
    </div>
  );
}
