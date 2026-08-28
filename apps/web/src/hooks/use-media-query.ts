import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query from React.
 *
 * SSR-safe: returns `false` on the server and on the first client render, then
 * updates after mount once `window.matchMedia` can be read. Use it only for
 * progressive enhancement (e.g. mounting a mobile-only affordance), never for
 * anything that must be correct before hydration.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);

    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [query]);

  return matches;
}
