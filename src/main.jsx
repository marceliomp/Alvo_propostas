import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ALVO_FAVICON_DATA_URL } from "./branding";

function ensureFavicon() {
  if (typeof document === "undefined") return;
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = ALVO_FAVICON_DATA_URL;
}

ensureFavicon();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
