"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * A filter value stored in the URL (?status=low). Filters survive refreshes,
 * can be linked to from other pages, and reset correctly when Next.js
 * restores a preserved page.
 */
export function useQueryState<T extends string = string>(
  key: string,
  fallback: NoInfer<T>,
  allowed?: readonly T[],
) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const raw = params.get(key) as T | null;
  const value = raw && (!allowed || allowed.includes(raw)) ? raw : fallback;

  const setValue = useCallback(
    (next: T | null) => {
      const search = new URLSearchParams(window.location.search);
      if (next === null || next === fallback) search.delete(key);
      else search.set(key, next);
      const query = search.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [fallback, key, pathname, router],
  );

  return [value, setValue] as const;
}
