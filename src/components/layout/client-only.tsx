"use client";

import { Suspense, use, type ReactNode } from "react";
import { browser } from "react-dom";

function BrowserGate({ children }: { children: ReactNode }) {
  use(browser("Inventory data is stored in this browser (localStorage), so it renders on the client."));
  return children;
}

/**
 * Renders children only in the browser. During the server prerender the
 * fallback becomes the initial HTML. Everything that reads the inventory
 * store sits inside one of these.
 */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <BrowserGate>{children}</BrowserGate>
    </Suspense>
  );
}
