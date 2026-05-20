import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

export type RepositoryInfo = {
  path: string;
  rootPath: string;
  name: string;
  currentBranch: string | null;
};

export type FileKind =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "untracked"
  | "conflicted"
  | "copied"
  | "typechange";

export type GitFileStatus = {
  path: string;
  originalPath: string | null;
  indexStatus: string;
  worktreeStatus: string;
  kind: FileKind;
  staged: boolean;
  conflicted: boolean;
};

export type GitStatus = {
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
};

export type FileDiff = {
  path: string;
  staged: boolean;
  diff: string;
  isBinary: boolean;
};

export type CommitSummary = {
  hash: string;
  shortHash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  subject: string;
};

export type GraphCommit = {
  hash: string;
  shortHash: string;
  parents: string[];
  refs: string[];
  authorName: string;
  date: string;
  subject: string;
};

export type GitBranch = {
  name: string;
  current: boolean;
  upstream: string | null;
};

export type CommitResult = {
  commitHash: string | null;
  summary: string;
};

export type RecentRepo = {
  id: number;
  path: string;
  name: string;
  lastOpenedAt: string;
};

export type AppError = {
  kind: string;
  message: string;
  exitCode: number | null;
};

export function isAppError(e: unknown): e is AppError {
  return typeof e === "object" && e !== null && "kind" in e && "message" in e;
}

export function errorMessage(e: unknown): string {
  if (isAppError(e)) return e.message;
  if (e instanceof Error) return e.message;
  return String(e);
}

export const api = {
  pickFolder: () =>
    openDialog({ directory: true, multiple: false }) as Promise<string | null>,

  validateRepository: (path: string) =>
    invoke<RepositoryInfo>("validate_repository", { path }),

  getStatus: (repoPath: string) => invoke<GitStatus>("get_status", { repoPath }),

  getFileDiff: (repoPath: string, filePath: string, staged: boolean) =>
    invoke<FileDiff>("get_file_diff", { repoPath, filePath, staged }),

  stageFile: (repoPath: string, filePath: string) =>
    invoke<void>("stage_file", { repoPath, filePath }),

  unstageFile: (repoPath: string, filePath: string) =>
    invoke<void>("unstage_file", { repoPath, filePath }),

  stageAll: (repoPath: string) => invoke<void>("stage_all", { repoPath }),

  unstageAll: (repoPath: string) => invoke<void>("unstage_all", { repoPath }),

  discardFile: (repoPath: string, filePath: string) =>
    invoke<void>("discard_file", { repoPath, filePath }),

  createCommit: (repoPath: string, message: string) =>
    invoke<CommitResult>("create_commit", { repoPath, message }),

  getCommitHistory: (repoPath: string, limit?: number) =>
    invoke<CommitSummary[]>("get_commit_history", { repoPath, limit }),

  getGraph: (repoPath: string, limit?: number) =>
    invoke<GraphCommit[]>("get_graph", { repoPath, limit }),

  listBranches: (repoPath: string) => invoke<GitBranch[]>("list_branches", { repoPath }),

  checkoutBranch: (repoPath: string, branch: string) =>
    invoke<void>("checkout_branch", { repoPath, branch }),

  createBranch: (repoPath: string, branch: string) =>
    invoke<void>("create_branch", { repoPath, branch }),

  fetch: (repoPath: string) => invoke<string>("fetch", { repoPath }),
  pull: (repoPath: string) => invoke<string>("pull", { repoPath }),
  push: (repoPath: string) => invoke<string>("push", { repoPath }),

  listRecentRepos: () => invoke<RecentRepo[]>("list_recent_repos"),
  addRecentRepo: (path: string, name: string) =>
    invoke<void>("add_recent_repo", { path, name }),
  removeRecentRepo: (path: string) => invoke<void>("remove_recent_repo", { path }),

  getPref: (key: string) => invoke<string | null>("get_pref", { key }),
  setPref: (key: string, value: string) => invoke<void>("set_pref", { key, value }),
};
