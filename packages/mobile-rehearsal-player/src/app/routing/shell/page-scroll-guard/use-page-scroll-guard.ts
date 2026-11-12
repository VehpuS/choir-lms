/**
 * Keeps the page itself from staying scrolled. Only the web has a page that can
 * be shifted (native screens do not scroll as a whole), so this is a no-op
 * here; the web version is `use-page-scroll-guard.web.ts`.
 */
export const usePageScrollGuard = (): void => undefined;
