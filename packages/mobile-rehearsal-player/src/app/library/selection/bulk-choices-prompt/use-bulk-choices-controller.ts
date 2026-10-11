import { useCallback, useRef, useState } from 'react';

import {
  bulkChoicePreferencesStore,
  type BulkChoicePreferencesStore,
} from '../bulk-choice-preferences-store';
import {
  getBulkChoiceCounts,
  resolveBulkChoices,
  type BulkChoiceQuestion,
} from '../bulk-choices';
import type {
  BulkSelectionItem,
  PlaybackExpansionContext,
  PlaybackExpansionOptions,
} from '../playback-expansion';
import { resolvePromptOutcome, type BulkChoiceAnswers } from './model';

type PendingPrompt = {
  decided: ReturnType<typeof resolveBulkChoices>['decided'];
  dueQuestions: BulkChoiceQuestion[];
  playlistLinkCount: number;
  repeatCount: number;
  resolve: (options: PlaybackExpansionOptions | null) => void;
};

export type BulkChoicesPromptRequest = Pick<
  PendingPrompt,
  'dueQuestions' | 'playlistLinkCount' | 'repeatCount'
>;

/**
 * The logic behind the bulk-choices prompt, free of any view so it can be
 * tested directly. `resolveChoices` answers straight away when nothing
 * qualifies or stored defaults decide; otherwise it exposes a `request` for the
 * view and resolves with the user's answers, or `null` on cancel (the action
 * must then apply nothing).
 */
export const useBulkChoicesController = (
  store: BulkChoicePreferencesStore = bulkChoicePreferencesStore,
) => {
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const pendingRef = useRef<PendingPrompt | null>(null);

  const resolveChoices = useCallback(
    async (
      items: readonly BulkSelectionItem[],
      context: PlaybackExpansionContext,
    ) => {
      // The stored defaults must be read before deciding whether to ask.
      await store.hydrate();
      // The live snapshot, not the hydrate result: that is only the first read
      // and misses a default remembered or reset since.
      const preferences = store.getSnapshot();
      const resolution = resolveBulkChoices({
        counts: getBulkChoiceCounts(items, context),
        preferences,
      });

      if (resolution.dueQuestions.length === 0) {
        return {
          playlists: resolution.decided.playlists ?? 'skip',
          repeats: resolution.decided.repeats ?? 'keep',
        } satisfies PlaybackExpansionOptions;
      }

      const { playlistLinkCount } = getBulkChoiceCounts(items, context);

      return new Promise<PlaybackExpansionOptions | null>((resolve) => {
        // A second request while one is open cancels the first.
        pendingRef.current?.resolve(null);

        const next: PendingPrompt = {
          decided: resolution.decided,
          dueQuestions: resolution.dueQuestions,
          playlistLinkCount,
          repeatCount: resolution.repeatCount,
          resolve,
        };

        pendingRef.current = next;
        setPending(next);
      });
    },
    [store],
  );

  const close = useCallback((options: PlaybackExpansionOptions | null) => {
    pendingRef.current?.resolve(options);
    pendingRef.current = null;
    setPending(null);
  }, []);

  const cancel = useCallback(() => {
    close(null);
  }, [close]);

  const confirm = useCallback(
    (result: { answers: BulkChoiceAnswers; remember: boolean }) => {
      const current = pendingRef.current;

      if (!current) {
        return;
      }

      const outcome = resolvePromptOutcome({
        answers: result.answers,
        decided: current.decided,
        dueQuestions: current.dueQuestions,
        preferences: store.getSnapshot(),
        remember: result.remember,
      });

      if (result.remember) {
        void store.update(outcome.preferences);
      }

      close(outcome.expansionOptions);
    },
    [close, store],
  );

  return {
    cancel,
    confirm,
    request: pending
      ? ({
          dueQuestions: pending.dueQuestions,
          playlistLinkCount: pending.playlistLinkCount,
          repeatCount: pending.repeatCount,
        } satisfies BulkChoicesPromptRequest)
      : null,
    resolveChoices,
  };
};
