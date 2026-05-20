import { ChangesPanel } from "./ChangesPanel";
import { DiffViewer } from "@/features/diff/DiffViewer";

export function ChangesView() {
  return (
    <div className="row" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
      <ChangesPanel />
      <DiffViewer />
    </div>
  );
}
