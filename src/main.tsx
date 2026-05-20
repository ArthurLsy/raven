import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { useTweaks } from "./features/tweaks/tweaks.store";
import "./styles.css";

// Hydrate persisted theme/accent before first paint commits visual changes.
void useTweaks.getState().hydrate();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
