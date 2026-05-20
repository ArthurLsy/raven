import * as React from "react";

type IconProps = {
  size?: number;
  stroke?: string;
  fill?: string;
  sw?: number;
  vb?: string;
  style?: React.CSSProperties;
  className?: string;
};

function SVGI({
  size = 14,
  fill = "none",
  stroke = "currentColor",
  sw = 1.5,
  vb = "0 0 24 24",
  style,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={vb}
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      className={className}
    >
      {children}
    </svg>
  );
}

export const Icons = {
  GitBranch: (p: IconProps) => (
    <SVGI {...p}>
      <circle cx="6" cy="3" r="2" />
      <circle cx="6" cy="21" r="2" />
      <circle cx="18" cy="7" r="2" />
      <path d="M6 5v14" />
      <path d="M18 9c0 4-5 5-12 5" />
    </SVGI>
  ),
  GitCommit: (p: IconProps) => (
    <SVGI {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M3 12h6m6 0h6" />
    </SVGI>
  ),
  GitMerge: (p: IconProps) => (
    <SVGI {...p}>
      <circle cx="18" cy="18" r="2" />
      <circle cx="6" cy="6" r="2" />
      <path d="M6 8v8a4 4 0 0 0 4 4h6" />
    </SVGI>
  ),
  Changes: (p: IconProps) => (
    <SVGI {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </SVGI>
  ),
  History: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </SVGI>
  ),
  Graph: (p: IconProps) => (
    <SVGI {...p}>
      <circle cx="5" cy="6" r="1.8" />
      <circle cx="19" cy="6" r="1.8" />
      <circle cx="12" cy="18" r="1.8" />
      <path d="M5 8v2c0 3 3 3 5 4M19 8v2c0 3-3 3-5 4" />
    </SVGI>
  ),
  Stash: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M3 7h18M3 12h18M3 17h12" />
    </SVGI>
  ),
  Search: (p: IconProps) => (
    <SVGI {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </SVGI>
  ),
  Plus: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M12 5v14M5 12h14" />
    </SVGI>
  ),
  Minus: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M5 12h14" />
    </SVGI>
  ),
  Refresh: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 21v-5h5" />
    </SVGI>
  ),
  Fetch: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 4v5h-5" />
    </SVGI>
  ),
  Pull: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M12 4v12m-5-5 5 5 5-5" />
      <path d="M4 20h16" />
    </SVGI>
  ),
  Push: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M12 20V8m-5 5 5-5 5 5" />
      <path d="M4 4h16" />
    </SVGI>
  ),
  Folder: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </SVGI>
  ),
  FolderOpen: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v.5" />
      <path d="M3 7v10a2 2 0 0 0 2 2h13.5a2 2 0 0 0 2-1.5L22 12H5l-2 5" />
    </SVGI>
  ),
  Settings: (p: IconProps) => (
    <SVGI {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </SVGI>
  ),
  Sun: (p: IconProps) => (
    <SVGI {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1m0 16v1M4.2 4.2l.7.7m14.2 14.2.7.7M3 12h1m16 0h1M4.2 19.8l.7-.7m14.2-14.2.7-.7" />
    </SVGI>
  ),
  Moon: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </SVGI>
  ),
  Sparkles: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M12 3 13.5 8.5 19 10 13.5 11.5 12 17 10.5 11.5 5 10 10.5 8.5z" />
      <path d="M19 17l.7 1.8L21.5 19.5l-1.8.7L19 22l-.7-1.8L16.5 19.5l1.8-.7z" />
    </SVGI>
  ),
  Wand: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M5 19 19 5" />
      <path d="M14 5h5v5" />
      <circle cx="7" cy="17" r="1" />
      <circle cx="11" cy="13" r=".5" />
    </SVGI>
  ),
  Check: (p: IconProps) => (
    <SVGI {...p}>
      <path d="m5 12 5 5L20 7" />
    </SVGI>
  ),
  Chevron: (p: IconProps) => (
    <SVGI {...p}>
      <path d="m9 6 6 6-6 6" />
    </SVGI>
  ),
  ChevronD: (p: IconProps) => (
    <SVGI {...p}>
      <path d="m6 9 6 6 6-6" />
    </SVGI>
  ),
  Dot: (p: IconProps) => (
    <SVGI {...p}>
      <circle cx="12" cy="12" r="3" />
    </SVGI>
  ),
  Arrow: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </SVGI>
  ),
  X: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M18 6 6 18M6 6l12 12" />
    </SVGI>
  ),
  File: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </SVGI>
  ),
  Copy: (p: IconProps) => (
    <SVGI {...p}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </SVGI>
  ),
  Diamond: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M12 2 22 12 12 22 2 12z" />
    </SVGI>
  ),
  Trash: (p: IconProps) => (
    <SVGI {...p}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </SVGI>
  ),
};

export type IconComponent = (p: IconProps) => React.ReactElement;
