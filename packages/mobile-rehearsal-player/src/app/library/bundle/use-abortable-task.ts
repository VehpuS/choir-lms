import { useCallback, useEffect, useRef } from 'react';

/**
 * Runs one cancellable task at a time. Starting a new one aborts the last,
 * `cancel` aborts the running one, and leaving the screen aborts it too, so a
 * closed sheet never keeps writing to Drive.
 */
export const useAbortableTask = () => {
  const controller = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
  }, []);

  const run = useCallback(
    async <Result>(task: (signal: AbortSignal) => Promise<Result>) => {
      controller.current?.abort();

      const next = new AbortController();

      controller.current = next;

      try {
        return await task(next.signal);
      } finally {
        if (controller.current === next) {
          controller.current = null;
        }
      }
    },
    [],
  );

  useEffect(() => cancel, [cancel]);

  return { cancel, run };
};
