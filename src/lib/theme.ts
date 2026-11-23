/**
 * Light/dark theme, stored in localStorage and applied as `data-theme` on
 * <html>. Without a saved choice the OS preference wins.
 */
export type Theme = "light" | "dark";

const STORAGE_KEY = "sasthasoft.theme";

/**
 * Inlined in <head> by the root layout. It runs before the first paint, so a
 * dark theme never flashes light on load.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}})()`;

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;
  // Switch every colour at once instead of letting hover transitions animate.
  root.classList.add("theme-switching");
  root.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
}

export const toggleTheme = () => setTheme(getTheme() === "dark" ? "light" : "dark");
