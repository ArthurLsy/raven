import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRepoStore } from "@/features/repository/repository.store";

export function ErrorBanner() {
  const error = useRepoStore((s) => s.error);
  const setError = useRepoStore((s) => s.setError);
  if (!error) return null;
  return (
    <div className="flex items-start gap-2 border-b border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <div className="flex-1 break-words">{error}</div>
      <Button
        variant="ghost"
        size="icon"
        className="size-6"
        onClick={() => setError(null)}
        title="Dismiss"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
