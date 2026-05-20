import { useEffect } from "react";
import { GitBranchIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatRelativeDate } from "@/lib/format";
import { useRepoStore } from "@/features/repository/repository.store";
import { RepositoryPicker } from "@/features/repository/RepositoryPicker";
import { errorMessage, api } from "@/lib/tauri";

export function Sidebar() {
  const recents = useRepoStore((s) => s.recents);
  const refreshRecents = useRepoStore((s) => s.refreshRecents);
  const openRepository = useRepoStore((s) => s.openRepository);
  const repo = useRepoStore((s) => s.repo);
  const setError = useRepoStore((s) => s.setError);

  useEffect(() => {
    refreshRecents();
  }, [refreshRecents]);

  async function handleRemove(path: string) {
    try {
      await api.removeRecentRepo(path);
      await refreshRecents();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-card/40">
      <div className="flex items-center gap-2 border-b px-3 py-3">
        <GitBranchIcon className="size-4 text-muted-foreground" />
        <span className="font-semibold tracking-tight">Git Client</span>
      </div>
      <div className="p-2">
        <RepositoryPicker size="sm" />
      </div>
      <Separator />
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Recent
      </div>
      <ScrollArea className="flex-1">
        <ul className="space-y-px px-1 pb-2">
          {recents.map((r) => (
            <li
              key={r.path}
              className={`group flex items-center justify-between rounded px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/60 ${
                repo?.rootPath === r.path ? "bg-muted" : ""
              }`}
              onClick={() => openRepository(r.path)}
              title={r.path}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {formatRelativeDate(r.lastOpenedAt)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(r.path);
                }}
              >
                <X className="size-3" />
              </Button>
            </li>
          ))}
          {recents.length === 0 && (
            <li className="px-2 py-3 text-xs text-muted-foreground">No recent repos</li>
          )}
        </ul>
      </ScrollArea>
    </aside>
  );
}
