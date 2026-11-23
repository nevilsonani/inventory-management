"use client";

import { Moon, Sun } from "lucide-react";
import { toggleTheme } from "@/lib/theme";

/**
 * The icon is chosen by CSS (the `dark:` variant), not React state, so the
 * server HTML is correct for both themes and nothing flickers on hydration.
 */
export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid size-9 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-950/5 hover:text-zinc-900"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      <Moon className="size-[18px] dark:hidden" aria-hidden />
      <Sun className="hidden size-[18px] dark:block" aria-hidden />
    </button>
  );
}
