import { useCallback, useEffect, useState } from "react";

const THEME_KEY = "nexttable.theme";
export type Theme = "light" | "dark";

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/** Reads the saved theme after hydration and keeps it in sync with localStorage. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_KEY);
    const initial: Theme =
      saved === "dark" || saved === "light"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
    apply(initial);
  }, []);

  const setAndPersist = useCallback((next: Theme) => {
    setTheme(next);
    apply(next);
    window.localStorage.setItem(THEME_KEY, next);
  }, []);

  return { theme, setTheme: setAndPersist, isDark: theme === "dark" };
}
