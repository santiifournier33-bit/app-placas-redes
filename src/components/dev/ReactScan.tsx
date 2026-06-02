"use client";

import { useEffect } from "react";

/**
 * Dev-only React Scan loader. Highlights unnecessary re-renders via the
 * react-scan toolbar. Never ships to production: the parent gates render on
 * NODE_ENV, and scan() is also disabled if it somehow runs outside dev.
 */
export default function ReactScan() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let cancelled = false;
    import("react-scan").then(({ scan }) => {
      if (cancelled) return;
      scan({ enabled: true, log: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
