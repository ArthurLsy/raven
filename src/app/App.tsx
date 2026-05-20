import { GitGraphIcon } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ErrorBanner } from "@/components/layout/ErrorBanner";
import { RepositoryPicker } from "@/features/repository/RepositoryPicker";
import { StatusPanel } from "@/features/status/StatusPanel";
import { DiffViewer } from "@/features/diff/DiffViewer";
import { CommitPanel } from "@/features/commit/CommitPanel";
import { HistoryPanel } from "@/features/history/HistoryPanel";
import { GitGraph } from "@/features/graph/GitGraph";
import { useRepoStore } from "@/features/repository/repository.store";

export default function App() {
  const repo = useRepoStore((s) => s.repo);
  const view = useRepoStore((s) => s.view);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <ErrorBanner />
        <main className="flex min-h-0 flex-1">
          {!repo ? <EmptyState /> : view === "status" ? <StatusView /> : view === "history" ? <HistoryPanel /> : <GitGraph />}
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <GitGraphIcon className="size-12 text-muted-foreground/40" />
      <h2 className="text-lg font-medium">Open a Git repository</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Select a folder containing a Git repository to inspect changes, view diffs, and create
        commits.
      </p>
      <RepositoryPicker />
    </div>
  );
}

function StatusView() {
  return (
    <div className="flex min-w-0 flex-1">
      <div className="flex w-72 shrink-0 flex-col border-r">
        <div className="flex-1 min-h-0">
          <StatusPanel />
        </div>
        <div className="h-44 border-t">
          <CommitPanel />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <DiffViewer />
      </div>
    </div>
  );
}
