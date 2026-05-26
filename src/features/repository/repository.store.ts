import { create } from "zustand";
import {
  api,
  errorMessage,
  type GitStatus,
  type RecentRepo,
  type RepositoryInfo,
} from "@/lib/tauri";

export type View = "changes" | "history" | "graph" | "branches" | "stash";

type Selection = {
  filePath: string;
  staged: boolean;
} | null;

type State = {
  repo: RepositoryInfo | null;
  status: GitStatus | null;
  recents: RecentRepo[];
  selectedFile: Selection;
  selectedHash: string | null;
  view: View;
  loading: boolean;
  error: string | null;
  statusMsg: string;
  paletteOpen: boolean;
};

type Actions = {
  openRepository: (path: string) => Promise<void>;
  closeRepository: () => void;
  refreshStatus: () => Promise<void>;
  refreshRecents: () => Promise<void>;
  selectFile: (s: Selection) => void;
  selectHash: (h: string | null) => void;
  setView: (v: View) => void;
  setError: (e: string | null) => void;
  setStatusMsg: (m: string) => void;
  setPaletteOpen: (o: boolean) => void;
};

export const useRepoStore = create<State & Actions>((set, get) => ({
  repo: null,
  status: null,
  recents: [],
  selectedFile: null,
  selectedHash: null,
  view: "changes",
  loading: false,
  error: null,
  statusMsg: "All systems normal",
  paletteOpen: false,

  async openRepository(path) {
    set({ loading: true, error: null });
    try {
      const info = await api.validateRepository(path);
      await api.addRecentRepo(info.rootPath, info.name);
      set({ repo: info, selectedFile: null, selectedHash: null });
      await get().refreshStatus();
      await get().refreshRecents();
    } catch (e) {
      set({ error: errorMessage(e) });
    } finally {
      set({ loading: false });
    }
  },

  closeRepository() {
    set({ repo: null, status: null, selectedFile: null, selectedHash: null });
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

  selectHash(h) {
    set({ selectedHash: h });
  },

  setView(v) {
    set({ view: v });
  },

  setError(e) {
    set({ error: e });
  },

  setStatusMsg(m) {
    set({ statusMsg: m });
  },

  setPaletteOpen(o) {
    set({ paletteOpen: o });
  },

}));
