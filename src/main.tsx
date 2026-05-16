import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Suppress blocking alerts that contain session conflict text and rely on the
// non-blocking banner in `AuthContext`/`Navbar` to inform the user.
try {
  const globalRef = window as any;
  if (!globalRef.__barbadosAlertPatched) {
    globalRef.__origAlert = window.alert.bind(window);
    window.alert = (msg?: any) => {
      try {
        const text = String(msg || '').toLowerCase();
        if (text.includes('session_conflict') || text.includes('session conflict') || text.includes('session_conflic')) {
          console.warn('Suppressed blocking alert for session_conflict:', msg);
          return;
        }
      } catch {
        // ignore
      }
      return globalRef.__origAlert(msg);
    };
    globalRef.__barbadosAlertPatched = true;
  }
} catch (e) {
  // ignore patch failures
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
