"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("SW registered", reg);

          // If there's an updated SW already waiting, tell it to skip waiting.
          if (reg.waiting) {
            console.log("SW waiting -> instructing to skipWaiting");
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }

          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            console.log("SW updatefound", newWorker);
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              console.log("SW new worker state", newWorker.state);
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New update available — ask it to activate immediately
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });
        })
        .catch((err) => console.error("SW registration failed", err));

      // When the new service worker takes control, reload to ensure clients use the latest assets
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("SW controller changed — reloading page to apply update");
        window.location.reload();
      });
    }
  }, []);

  return null;
}
