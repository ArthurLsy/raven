import { create } from "zustand";
import { api } from "@/lib/tauri";

export type Theme = "dark" | "light";
export type Density = "compact" | "cozy" | "comfy";

export type AccentHue =
  | "285" // indigo
  | "305" // violet
  | "250" // blue
  | "200" // cyan
  | "150" // lime
  | "75"  // amber
  | "20"; // rose

export const ACCENTS: { key: AccentHue; name: string }[] = [
  { key: "285", name: "Indigo" },
  { key: "305", name: "Violet" },
  { key: "250", name: "Blue" },
  { key: "200", name: "Cyan" },
  { key: "150", name: "Lime" },
  { key: "75", name: "Amber" },
  { key: "20", name: "Rose" },
];

type Tweaks = {
  theme: Theme;
  accent: AccentHue;
  density: Density;
  showActivity: boolean;
};

const DEFAULT_TWEAKS: Tweaks = {
  theme: "dark",
  accent: "285",
  density: "cozy",
  showActivity: true,
};

const PREF_KEY = "tweaks";

type State = Tweaks & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
};

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function applyAccent(accent: AccentHue, theme: Theme) {
  const h = parseInt(accent, 10) || 285;
  const isDark = theme === "dark";
  const L1 = isDark ? 0.72 : 0.55;
  const L2 = isDark ? 0.65 : 0.48;
  const C1 = isDark ? 0.18 : 0.2;
  const C2 = isDark ? 0.2 : 0.22;
  const softA = isDark ? 0.14 : 0.1;
  const lineA = isDark ? 0.4 : 0.3;
  const root = document.documentElement;
  root.style.setProperty("--accent", `oklch(${L1} ${C1} ${h})`);
  root.style.setProperty("--accent-2", `oklch(${L2} ${C2} ${h})`);
  root.style.setProperty("--accent-soft", `oklch(${L1} ${C1} ${h} / ${softA})`);
  root.style.setProperty("--accent-line", `oklch(${L1} ${C1} ${h} / ${lineA})`);
  root.style.setProperty("--accent-fg", h > 70 && h < 180 ? "#0c0c0c" : "#fff");
}

function persist(t: Tweaks) {
  api
    .setPref(PREF_KEY, JSON.stringify(t))
    .catch(() => undefined);
}

export const useTweaks = create<State>((setState, get) => ({
  ...DEFAULT_TWEAKS,
  hydrated: false,

  async hydrate() {
    let next: Tweaks = DEFAULT_TWEAKS;
    try {
      const raw = await api.getPref(PREF_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        next = { ...DEFAULT_TWEAKS, ...parsed };
      }
    } catch {
      // ignore
    }
    applyTheme(next.theme);
    applyAccent(next.accent, next.theme);
    setState({ ...next, hydrated: true });
  },

  set(key, value) {
    const prev = get();
    const next: Tweaks = { ...prev, [key]: value };
    if (key === "theme") applyTheme(value as Theme);
    if (key === "accent" || key === "theme") applyAccent(next.accent, next.theme);
    setState({ [key]: value } as Partial<State>);
    persist(next);
  },
}));
