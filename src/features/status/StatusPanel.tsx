import { useMemo } from "react";
import { RefreshCw, PlusCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { api, errorMessage, type GitFileStatus } from "@/lib/tauri";
import { useRepoStore } from "../repository/repository.store";
import { FileStatusList } from "./FileStatusList";

export function StatusPanel() {
  const repo = useRepoStore((s) => s.repo);
  const status = useRepoStore((s) => s.status);
  const refreshStatus = useRepoStore((s) => s.refreshStatus);
  const setError = useRepoStore((s) => s.setError);

  const { staged, unstaged, untracked, conflicted } = useMemo(() => {
    const groups: Record<string, GitFileStatus[]> = {
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
    };
    if (status) {
      for (const f of status.files) {
        if (f.conflicted) groups.conflicted.push(f);
        else if (f.kind === "untracked") groups.untracked.push(f);
        else if (f.staged) groups.staged.push(f);
        if (!f.conflicted && f.worktreeStatus !== "." && f.worktreeStatus !== "?") {
          groups.unstaged.push(f);
        }
      }
    }
    return groups;
  }, [status]);

  if (!repo) return null;

  async function handleStageAll() {
    if (!repo) return;
    try {
      await api.stageAll(repo.rootPath);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleUnstageAll() {
    if (!repo) return;
    try {
      await api.unstageAll(repo.rootPath);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Changes
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="Stage all" onClick={handleStageAll}>
            <PlusCircle className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Unstage all" onClick={handleUnstageAll}>
            <MinusCircle className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Refresh" onClick={() => refreshStatus()}>
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-2 py-2">
          {conflicted.length > 0 && (
            <FileStatusList title="Conflicts" files={conflicted} group="conflicted" />
          )}
          {staged.length > 0 && (
            <>
              <FileStatusList title="Staged" files={staged} group="staged" />
              <Separator className="my-2" />
            </>
          )}
          <FileStatusList
            title="Changes"
            files={[...unstaged, ...untracked].sort((a, b) => a.path.localeCompare(b.path))}
            group="unstaged"
            emptyMessage="No local changes"
          />
        </div>
      </ScrollArea>
    </div>
  );
}
