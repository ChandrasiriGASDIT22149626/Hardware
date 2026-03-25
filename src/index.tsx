import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LanguageProvider } from "./context/LanguageContext"; // <-- This imports the file we just made!

const container = document.getElementById("root");

if (container) {
  const root = createRoot(container); 
  
  root.render(
    <React.StrictMode>
      <LanguageProvider> {/* <-- This wraps the app in the languages */}
        <App />
      </LanguageProvider>
    </React.StrictMode>
  );
}