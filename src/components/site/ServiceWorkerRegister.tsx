"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js in production builds only — in `next dev` a
 * caching worker would serve stale chunks across hot reloads.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Registration failing (private mode, blocked storage) only costs
        // offline support; the site itself keeps working.
      });
  }, []);
  return null;
}
