import type { SheetMusicSource } from '@org/audio-library-models';
import { useCallback, useEffect, useState } from 'react';

import type {
  SheetMusicLoadFailureReason,
  SheetMusicLoadResult,
  SheetMusicLoader,
} from '../sheet-music-loader';

export type LoadedSheetMusic = Extract<
  SheetMusicLoadResult,
  { status: 'loaded' }
>;

export type SheetMusicDocumentState =
  | { document: LoadedSheetMusic; status: 'loaded' }
  | { reason: SheetMusicLoadFailureReason; status: 'failed' }
  | { status: 'loading' };

const LOADING: SheetMusicDocumentState = { status: 'loading' };

/**
 * Loads a source when the viewer shows it, cancels the request when the source
 * changes or the viewer closes, and ignores an answer that arrives after that.
 * A failure changes nothing that is stored; `retry` asks again.
 */
export const useSheetMusicDocument = (
  source: SheetMusicSource | undefined,
  loader: SheetMusicLoader,
) => {
  const [state, setState] = useState<SheetMusicDocumentState>(LOADING);
  const [attempt, setAttempt] = useState(0);
  const sourceId = source?.id;

  useEffect(() => {
    if (!source) {
      return undefined;
    }

    const controller = new AbortController();
    let isCurrent = true;

    setState(LOADING);

    void loader.load(source, { signal: controller.signal }).then((result) => {
      if (!isCurrent) {
        return;
      }

      setState(
        result.status === 'loaded'
          ? { document: result, status: 'loaded' }
          : { reason: result.reason, status: 'failed' },
      );
    });

    return () => {
      isCurrent = false;
      controller.abort();
    };
    // A rename must not reload the file, so the source is keyed by its id.
  }, [attempt, loader, sourceId]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { retry, state };
};
