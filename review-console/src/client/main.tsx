import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ReviewConsoleApp } from "./ReviewConsoleApp";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ReviewConsoleApp />
  </StrictMode>,
);
