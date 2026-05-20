import { Icons } from "@/lib/icons";
import { useRepoStore } from "@/features/repository/repository.store";

export function ErrorBanner() {
  const error = useRepoStore((s) => s.error);
  const setError = useRepoStore((s) => s.setError);
  if (!error) return null;
  return (
    <div
      className="row"
      style={{
        padding: "8px 14px",
        gap: 10,
        borderBottom: "1px solid color-mix(in oklch, var(--del-fg) 40%, transparent)",
        background: "color-mix(in oklch, var(--del-fg) 10%, transparent)",
        color: "var(--del-fg)",
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      <div style={{ flex: 1, wordBreak: "break-word" }}>{error}</div>
      <button
        onClick={() => setError(null)}
        title="Dismiss"
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          display: "grid",
          placeItems: "center",
          color: "var(--del-fg)",
        }}
        className="hover-bg"
      >
        <Icons.X size={13} />
      </button>
    </div>
  );
}
