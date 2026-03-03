import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// Minimal body reset (no CSS file needed)
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.backgroundColor = "#fafaf8";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
