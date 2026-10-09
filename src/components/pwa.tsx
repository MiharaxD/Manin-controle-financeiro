"use client";
import { useEffect } from "react";
export function Pwa() {
  useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      (location.protocol === "https:" || location.hostname === "localhost")
    )
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* Installation may be unsupported in private browsing. */
      });
  }, []);
  return null;
}
