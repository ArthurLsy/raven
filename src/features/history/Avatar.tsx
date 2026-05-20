import { authorColor } from "@/lib/colors";

export function Avatar({
  author,
  size = 22,
}: {
  author: string;
  size?: number;
}) {
  const { initials, color } = authorColor(author);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: `color-mix(in oklch, ${color} 18%, transparent)`,
        color,
        border: `1px solid color-mix(in oklch, ${color} 40%, transparent)`,
        display: "grid",
        placeItems: "center",
        fontSize: Math.round(size * 0.42),
        fontWeight: 600,
        letterSpacing: 0.4,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
