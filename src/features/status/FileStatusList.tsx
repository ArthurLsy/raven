import { Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorMessage, type FileKind, type GitFileStatus } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import { useRepoStore } from "../repository/repository.store";

const kindLabel: Record<FileKind, string> = {
  modified: "M",
  added: "A",
  deleted: "D",
  renamed: "R",
  untracked: "?",
  conflicted: "!",
  copied: "C",
  typechange: "T",
};

const kindColor: Record<FileKind, string> = {
  modified: "text-yellow-500",
  added: "text-emerald-500",
  deleted: "text-red-500",
  renamed: "text-blue-500",
  untracked: "text-muted-foreground",
  conflicted: "text-red-500",
  copied: "text-blue-500",
  typechange: "text-yellow-500",
};

type Group = "staged" | "unstaged" | "conflicted";

export function FileStatusList({
  title,
  files,
  group,
  emptyMessage,
}: {
  title: string;
  files: GitFileStatus[];
  group: Group;
  emptyMessage?: string;
}) {
  const repo = useRepoStore((s) => s.repo);
  const selected = useRepoStore((s) => s.selectedFile);
  const selectFile = useRepoStore((s) => s.selectFile);
  const refreshStatus = useRepoStore((s) => s.refreshStatus);
  const setError = useRepoStore((s) => s.setError);

  async function handleStage(f: GitFileStatus) {
    if (!repo) return;
    try {
      await api.stageFile(repo.rootPath, f.path);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleUnstage(f: GitFileStatus) {
    if (!repo) return;
    try {
      await api.unstageFile(repo.rootPath, f.path);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleDiscard(f: GitFileStatus) {
    if (!repo) return;
    const confirmed = window.confirm(
      `Discard local changes to ${f.path}? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await api.discardFile(repo.rootPath, f.path);
      await refreshStatus();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="mb-2">
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title} {files.length > 0 && <span className="text-muted-foreground/60">({files.length})</span>}
      </div>
      {files.length === 0 && emptyMessage ? (
        <div className="px-2 py-3 text-xs text-muted-foreground">{emptyMessage}</div>
      ) : (
        <ul className="space-y-px">
          {files.map((f) => {
            const isSelected =
              selected?.filePath === f.path && selected?.staged === (group === "staged");
            return (
              <li
                key={`${group}-${f.path}`}
                className={cn(
                  "group flex items-center gap-2 rounded px-2 py-1 text-xs cursor-pointer",
                  isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
                )}
                onClick={() => selectFile({ filePath: f.path, staged: group === "staged" })}
              >
                <span className={cn("font-mono w-3 text-center", kindColor[f.kind])}>
                  {kindLabel[f.kind]}
                </span>
                <span className="flex-1 truncate font-mono">{f.path}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                  {group === "staged" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      title="Unstage"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnstage(f);
                      }}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        title="Stage"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStage(f);
                        }}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        title="Discard"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDiscard(f);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
