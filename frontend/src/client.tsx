import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";
import { StaticApp } from "./static-app";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <StaticApp />
  </StrictMode>,
);
