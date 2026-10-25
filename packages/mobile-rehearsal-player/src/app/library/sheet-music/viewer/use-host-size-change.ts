import { useEffect, useRef } from 'react';

// The app's TypeScript config carries no DOM library, so the slice of the DOM
// used here is described structurally.
type SizedHost = { clientHeight: number; clientWidth: number };
type ResizeObserverLike = {
  disconnect(): void;
  observe(target: unknown): void;
};
type ResizeObserverConstructor = new (
  callback: () => void,
) => ResizeObserverLike;

const RESIZE_DEBOUNCE_MS = 150;

export type HostSizeChange = { hasHeightChanged: boolean };

/**
 * Calls `onChange` once the host's width or height has settled on a new value
 * (a rotated phone, a resized window). Resizing fires many times, so the call
 * waits for a quiet moment. The latest `onChange` is used without restarting
 * the observer.
 */
export const useHostSizeChange = (
  host: SizedHost | null,
  onChange: (change: HostSizeChange) => void,
) => {
  const latest = useRef(onChange);

  latest.current = onChange;

  useEffect(() => {
    const Observer = (
      globalThis as { ResizeObserver?: ResizeObserverConstructor }
    ).ResizeObserver;

    if (!host || !Observer) {
      return undefined;
    }

    let lastHeight = host.clientHeight;
    let lastWidth = host.clientWidth;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new Observer(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const hasHeightChanged = host.clientHeight !== lastHeight;

        if (host.clientWidth === lastWidth && !hasHeightChanged) {
          return;
        }

        lastHeight = host.clientHeight;
        lastWidth = host.clientWidth;
        latest.current({ hasHeightChanged });
      }, RESIZE_DEBOUNCE_MS);
    });

    observer.observe(host);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [host]);
};
