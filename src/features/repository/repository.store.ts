import { create } from "zustand";
import {
  api,
  errorMessage,
  type GitStatus,
  type RecentRepo,
  type RepositoryInfo,
} from "@/lib/tauri";

export type View = "status" | "history" | "graph";

type Selection = {
  filePath: string;
  staged: boolean;
} | null;

type State = {
  repo: RepositoryInfo | null;
  status: GitStatus | null;
  recents: RecentRepo[];
  selectedFile: Selection;
  view: View;
  loading: boolean;
  error: string | null;
};

type Actions = {
  openRepository: (path: string) => Promise<void>;
  closeRepository: () => void;
  refreshStatus: () => Promise<void>;
  refreshRecents: () => Promise<void>;
  selectFile: (s: Selection) => void;
  setView: (v: View) => void;
  setError: (e: string | null) => void;
};

export const useRepoStore = create<State & Actions>((set, get) => ({
  repo: null,
  status: null,
  recents: [],
  selectedFile: null,
  view: "status",
  loading: false,
  error: null,

  async openRepository(path) {
    set({ loading: true, error: null });
    try {
      const info = await api.validateRepository(path);
      await api.addRecentRepo(info.rootPath, info.name);
      set({ repo: info, selectedFile: null });
      await get().refreshStatus();
      await get().refreshRecents();
    } catch (e) {
      set({ error: errorMessage(e) });
    } finally {
      set({ loading: false });
    }
  },

  closeRepository() {
    set({ repo: null, status: null, selectedFile: null });
  },

  async refreshStatus() {
    const repo = get().repo;
    if (!repo) return;
    try {
      const status = await api.getStatus(repo.rootPath);
      const branch = status.branch ?? repo.currentBranch;
      set({
        status,
        repo: { ...repo, currentBranch: branch },
        error: null,
      });
    } catch (e) {
      set({ error: errorMessage(e) });
    }
  },

  async refreshRecents() {
    try {
      const recents = await api.listRecentRepos();
      set({ recents });
    } catch (e) {
      set({ error: errorMessage(e) });
    }
  },

  selectFile(s) {
    set({ selectedFile: s });
  },

  setView(v) {
    set({ view: v });
  },

  setError(e) {
    set({ error: e });
  },
}));
