import { useEffect, useState } from "react";
import { GitBranchIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage, type GitBranch } from "@/lib/tauri";
import { useRepoStore } from "../repository/repository.store";

export function BranchSwitcher() {
  const repo = useRepoStore((s) => s.repo);
  const refreshStatus = useRepoStore((s) => s.refreshStatus);
  const setError = useRepoStore((s) => s.setError);

  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [creatingName, setCreatingName] = useState("");

  useEffect(() => {
    if (!repo || !open) return;
    api
      .listBranches(repo.rootPath)
      .then(setBranches)
      .catch((e) => setError(errorMessage(e)));
  }, [repo, open, setError]);

  async function handleCheckout(name: string) {
    if (!repo) return;
    try {
      await api.checkoutBranch(repo.rootPath, name);
      setOpen(false);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleCreate() {
    if (!repo || !creatingName.trim()) return;
    try {
      await api.createBranch(repo.rootPath, creatingName.trim());
      setCreatingName("");
      setOpen(false);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (!repo) return null;

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <GitBranchIcon className="size-4" />
        {repo.currentBranch ?? "detached"}
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-72 rounded-md border bg-card p-2 shadow-lg">
          <ul className="max-h-64 overflow-auto">
            {branches.map((b) => (
              <li
                key={b.name}
                className="flex cursor-pointer items-center justify-between rounded px-2 py-1 text-sm hover:bg-muted"
                onClick={() => handleCheckout(b.name)}
              >
                <span className={b.current ? "font-medium" : ""}>{b.name}</span>
                {b.upstream && (
                  <span className="text-xs text-muted-foreground">{b.upstream}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-1 border-t pt-2">
            <Input
              placeholder="new-branch"
              value={creatingName}
              onChange={(e) => setCreatingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
            <Button size="icon" variant="outline" onClick={handleCreate}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
