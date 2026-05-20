import { GitGraphIcon, FolderGit2, History, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useRepoStore, type View } from "@/features/repository/repository.store";
import { BranchSwitcher } from "@/features/branches/BranchSwitcher";
import { RemoteActions } from "@/features/remotes/RemoteActions";

const tabs: { value: View; label: string; icon: React.ReactNode }[] = [
  { value: "status", label: "Changes", icon: <LayoutGrid className="size-4" /> },
  { value: "history", label: "History", icon: <History className="size-4" /> },
  { value: "graph", label: "Graph", icon: <GitGraphIcon className="size-4" /> },
];

export function TopBar() {
  const repo = useRepoStore((s) => s.repo);
  const view = useRepoStore((s) => s.view);
  const setView = useRepoStore((s) => s.setView);
  const status = useRepoStore((s) => s.status);

  return (
    <div className="flex h-12 items-center gap-2 border-b bg-card/30 px-3">
      <div className="flex min-w-0 items-center gap-2">
        <FolderGit2 className="size-4 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{repo?.name ?? "No repository"}</span>
        {repo && (
          <span className="truncate text-xs text-muted-foreground">{repo.rootPath}</span>
        )}
      </div>

      <Separator orientation="vertical" className="mx-2 h-5" />

      <div className="flex items-center gap-1">
        {tabs.map((t) => (
          <Button
            key={t.value}
            size="sm"
            variant="ghost"
            onClick={() => setView(t.value)}
            disabled={!repo}
            className={cn(view === t.value && "bg-accent text-accent-foreground")}
          >
            {t.icon}
            {t.label}
          </Button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {status && (status.ahead > 0 || status.behind > 0) && (
          <span className="text-xs text-muted-foreground">
            ↑{status.ahead} ↓{status.behind}
          </span>
        )}
        {repo && <RemoteActions />}
        {repo && <BranchSwitcher />}
      </div>
    </div>
  );
}
