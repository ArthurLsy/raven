import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/tauri";
import { useRepoStore } from "./repository.store";

export function RepositoryPicker({ size = "default" }: { size?: "default" | "sm" }) {
  const openRepository = useRepoStore((s) => s.openRepository);
  const setError = useRepoStore((s) => s.setError);

  async function handlePick() {
    try {
      const path = await api.pickFolder();
      if (path) {
        await openRepository(path);
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Button onClick={handlePick} size={size === "sm" ? "sm" : "default"}>
      <FolderOpen className="size-4" />
      Open Repository
    </Button>
  );
}
