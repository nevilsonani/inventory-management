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

/**
 * Page content that reads the store. Each page wraps its view in this (rather
 * than the root layout wrapping every page) so the browser-only boundary sits
 * inside the page segment, where Next.js can prerender the skeleton and
 * validate instant navigation.
 */
export function ClientPage({ children }: { children: ReactNode }) {
  return <ClientOnly fallback={<PageSkeleton />}>{children}</ClientOnly>;
}

function PageSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-48 rounded-lg bg-zinc-200/70" />
        <div className="h-4 w-80 max-w-full rounded bg-zinc-200/50" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 rounded-xl bg-white ring-1 ring-zinc-950/[0.05]" />
        ))}
      </div>
      <div className="mt-4 h-80 rounded-xl bg-white ring-1 ring-zinc-950/[0.05]" />
    </div>
  );
}
