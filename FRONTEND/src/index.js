import { publicAsset } from "./config/urls";
import { registerServiceWorker } from "./registerServiceWorker";
import React from "react";

import ReactDOM from "react-dom/client";

import App from "./App";

import "./index.css";

document.documentElement.style.setProperty("--se-factory-image", `url("${publicAsset("se-factory.jpg")}")`);

const root =
  ReactDOM.createRoot(
    document.getElementById(
      "root"
    )
  );

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerServiceWorker();
