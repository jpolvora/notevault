import "./assets/main.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Configure monaco-editor/react to use the local monaco-editor distribution
loader.config({ monaco });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
