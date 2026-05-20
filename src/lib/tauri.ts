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

export type LineKind = "ctx" | "add" | "del";

export type DiffLineDTO = {
  t: LineKind;
  n1: number | null;
  n2: number | null;
  s: string;
};

export type Hunk = {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  rawText: string;
  lines: DiffLineDTO[];
};

export type FileDiff = {
  path: string;
  staged: boolean;
  additions: number;
  deletions: number;
  isBinary: boolean;
  hunks: Hunk[];
};

export type CommitStatsDTO = {
  f: number;
  a: number;
  d: number;
};

export type CommitSummary = {
  hash: string;
  shortHash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  subject: string;
  body: string;
  parents: string[];
  refs: string[];
  stats: CommitStatsDTO;
  branchColor: number;
};

export type CommitFile = {
  path: string;
  status: string;
  a: number;
  d: number;
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

export type LastCommitInfo = {
  hash: string;
  short: string;
  msg: string;
  author: string;
  time: string;
};

export type EnrichedBranch = {
  name: string;
  current: boolean;
  upstream: string | null;
  ahead: number;
  behind: number;
  lastCommit: LastCommitInfo | null;
  lane: number;
  merged: boolean;
  stale: boolean;
};

export type TagInfo = {
  name: string;
  hash: string;
  short: string;
  time: string;
};

export type BranchesBundle = {
  local: EnrichedBranch[];
  remote: EnrichedBranch[];
  tags: TagInfo[];
};

export type StashFile = {
  path: string;
  status: string;
  a: number;
  d: number;
};

export type Stash = {
  id: string;
  msg: string;
  branch: string;
  time: string;
  files: StashFile[];
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

  stageHunk: (repoPath: string, filePath: string, rawPatch: string) =>
    invoke<void>("stage_hunk", { repoPath, filePath, rawPatch }),

  unstageHunk: (repoPath: string, filePath: string, rawPatch: string) =>
    invoke<void>("unstage_hunk", { repoPath, filePath, rawPatch }),

  createCommit: (repoPath: string, message: string) =>
    invoke<CommitResult>("create_commit", { repoPath, message }),

  getCommitHistory: (repoPath: string, limit?: number) =>
    invoke<CommitSummary[]>("get_commit_history", { repoPath, limit }),

  getCommitFiles: (repoPath: string, hash: string) =>
    invoke<CommitFile[]>("get_commit_files", { repoPath, hash }),

  getGraph: (repoPath: string, limit?: number) =>
    invoke<GraphCommit[]>("get_graph", { repoPath, limit }),

  listBranches: (repoPath: string) => invoke<GitBranch[]>("list_branches", { repoPath }),

  listBranchesEnriched: (repoPath: string) =>
    invoke<BranchesBundle>("list_branches_enriched", { repoPath }),

  checkoutBranch: (repoPath: string, branch: string) =>
    invoke<void>("checkout_branch", { repoPath, branch }),

  createBranch: (repoPath: string, branch: string) =>
    invoke<void>("create_branch", { repoPath, branch }),

  mergeBranch: (repoPath: string, branch: string) =>
    invoke<string>("merge_branch", { repoPath, branch }),

  listStashes: (repoPath: string) => invoke<Stash[]>("list_stashes", { repoPath }),

  stashCreate: (repoPath: string, message?: string) =>
    invoke<string>("stash_create", { repoPath, message }),

  stashPop: (repoPath: string, id: string) =>
    invoke<string>("stash_pop", { repoPath, id }),

  stashApply: (repoPath: string, id: string) =>
    invoke<string>("stash_apply", { repoPath, id }),

  stashDrop: (repoPath: string, id: string) =>
    invoke<string>("stash_drop", { repoPath, id }),

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
