"use client";
import { useEffect } from "react";
export function Pwa() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // Development chunks change during HMR. Offline reload is verified on the static build.
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations
              .filter(
                (r) =>
                  (r.active ?? r.waiting ?? r.installing)?.scriptURL ===
                  location.origin + "/sw.js",
              )
              .map((r) => r.unregister()),
          ),
        );
      return;
    }
    if (location.protocol === "https:" || location.hostname === "localhost")
      void navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .catch(() => {});
  }, []);
  return null;
}
