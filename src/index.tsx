import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client"; // Import createRoot from the 'client' path
import { App } from "./App";

const container = document.getElementById("root");

// The '!' ensures TypeScript knows the root element exists
if (container) {
  const root = createRoot(container); 
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}