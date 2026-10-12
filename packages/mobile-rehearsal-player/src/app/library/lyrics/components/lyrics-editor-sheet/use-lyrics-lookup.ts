import { useEffect, type Dispatch } from 'react';

import type { LyricsLookupClient } from '../../lyrics-lookup-client';
import type { LyricsEditorAction, LyricsEditorState } from './model';

/**
 * Runs the lookup while the editor is in its `loading` state. The query is read
 * when the lookup starts, so later typing does not restart it; leaving the
 * state (or closing the sheet) aborts the request.
 */
export const useLyricsLookup = (options: {
  dispatch: Dispatch<LyricsEditorAction>;
  lookupClient: LyricsLookupClient;
  state: LyricsEditorState;
  trackDurationMs?: number;
}) => {
  const { dispatch, lookupClient, state, trackDurationMs } = options;
  const isLoading = state.lookup.status === 'loading';
  const { artist, title } = state;

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const controller = new AbortController();

    void lookupClient
      .search(
        { artist, durationMs: trackDurationMs, title },
        { signal: controller.signal },
      )
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        dispatch(
          result.status === 'ok'
            ? { candidates: result.candidates, type: 'lookup-succeeded' }
            : { reason: result.reason, type: 'lookup-failed' },
        );
      });

    return () => {
      controller.abort();
    };
    // Only the transition into `loading` starts a request.
  }, [isLoading]);
};
