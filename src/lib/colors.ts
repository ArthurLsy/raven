// Stable hue derivation from a string (author name, etc.)
export function authorColor(name: string): { initials: string; color: string } {
  const initials = name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("")
    .padEnd(1, name[0]?.toUpperCase() ?? "?");

  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  const hue = ((h % 360) + 360) % 360;
  return {
    initials: initials.slice(0, 2),
    color: `oklch(0.74 0.15 ${hue})`,
  };
}

// Branch-by-extension grouping for the Changes view
export type ChangeGroup = "source" | "content" | "style" | "deps" | "docs";

export const CHANGE_GROUPS: Record<
  ChangeGroup,
  { label: string; tone: "indigo" | "amber" | "rose" | "cyan" | "slate" }
> = {
  source: { label: "Source", tone: "indigo" },
  content: { label: "Content", tone: "amber" },
  style: { label: "Styles", tone: "rose" },
  deps: { label: "Dependencies", tone: "cyan" },
  docs: { label: "Docs", tone: "slate" },
};

const SOURCE_EXT = new Set([
  "ts", "tsx", "js", "jsx", "rs", "py", "go", "java", "kt", "swift",
  "c", "cc", "cpp", "h", "hpp", "rb", "php", "cs", "vue", "svelte", "sh", "lua",
]);
const CONTENT_EXT = new Set(["md", "mdx", "txt", "html", "json", "yaml", "yml", "toml"]);
const STYLE_EXT = new Set(["css", "scss", "sass", "less"]);
const DEPS_FILES = new Set([
  "package.json",
  "bun.lock",
  "bun.lockb",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "Cargo.toml",
  "Cargo.lock",
  "go.mod",
  "go.sum",
  "requirements.txt",
  "Pipfile",
  "Pipfile.lock",
  "poetry.lock",
  "Gemfile",
  "Gemfile.lock",
]);
const DOCS_FILES = new Set([
  "README.md",
  "README",
  "LICENSE",
  "LICENSE.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
]);

export function deriveGroup(path: string): ChangeGroup {
  const segs = path.split("/");
  const base = segs[segs.length - 1] || path;
  if (DOCS_FILES.has(base)) return "docs";
  if (DEPS_FILES.has(base)) return "deps";
  const ext = base.includes(".") ? base.split(".").pop()!.toLowerCase() : "";
  if (SOURCE_EXT.has(ext)) return "source";
  if (STYLE_EXT.has(ext)) return "style";
  if (CONTENT_EXT.has(ext)) {
    // docs heuristic: top-level *.md → docs
    if (segs.length === 1 && (ext === "md" || ext === "mdx")) return "docs";
    return "content";
  }
  return "source";
}
