import {
  expandSelectionForPlayback,
  type BulkSelectionItem,
  type PlaybackExpansionContext,
  type PlaybackExpansionOptions,
} from './playback-expansion.js';

export type PlaylistsInFoldersPreference = 'ask' | 'include' | 'skip';
export type RepeatedItemsPreference = 'ask' | 'keep' | 'remove';

/** Stored defaults for the two bulk-selection questions (design: "Bulk action preferences"). */
export type BulkChoicePreferences = {
  playlistsInFolders: PlaylistsInFoldersPreference;
  repeatedItems: RepeatedItemsPreference;
};

export const DEFAULT_BULK_CHOICE_PREFERENCES: BulkChoicePreferences = {
  playlistsInFolders: 'ask',
  repeatedItems: 'ask',
};

export type BulkChoiceQuestion = 'playlists' | 'repeats';

export type BulkChoiceCounts = {
  playlistLinkCount: number;
  /** Repeats in the result if the folders' playlist links are expanded. */
  repeatCountWithPlaylists: number;
  /** Repeats in the result if the folders' playlist links are skipped. */
  repeatCountWithoutPlaylists: number;
};

/**
 * Counts what each answer would change, so the repeats question is only asked
 * about repeats that survive the user's playlists answer.
 */
export const getBulkChoiceCounts = (
  items: readonly BulkSelectionItem[],
  context: PlaybackExpansionContext,
): BulkChoiceCounts => {
  const skipped = expandSelectionForPlayback(items, context, {
    playlists: 'skip',
    repeats: 'keep',
  });
  const included = expandSelectionForPlayback(items, context, {
    playlists: 'include',
    repeats: 'keep',
  });

  return {
    playlistLinkCount: skipped.playlistLinkCount,
    repeatCountWithPlaylists: included.repeatCount,
    repeatCountWithoutPlaylists: skipped.repeatCount,
  };
};

export type BulkChoiceResolution = {
  /** Answers that need no prompt: stored defaults, or a question that does not arise. */
  decided: Partial<PlaybackExpansionOptions>;
  /** Questions to ask together in one prompt, in display order. */
  dueQuestions: BulkChoiceQuestion[];
  /** The repeats a removal would drop, for the prompt's count (0 when none can arise). */
  repeatCount: number;
};

/**
 * Which questions a bulk playback or playlist action must ask. Never prompts
 * when nothing qualifies or when a stored default already answers it.
 */
export const resolveBulkChoices = ({
  counts,
  preferences,
}: {
  counts: BulkChoiceCounts;
  preferences: BulkChoicePreferences;
}): BulkChoiceResolution => {
  const decided: Partial<PlaybackExpansionOptions> = {};
  const dueQuestions: BulkChoiceQuestion[] = [];

  if (counts.playlistLinkCount === 0) {
    decided.playlists = 'skip';
  } else if (preferences.playlistsInFolders === 'ask') {
    dueQuestions.push('playlists');
  } else {
    decided.playlists = preferences.playlistsInFolders;
  }

  // Until the playlists answer is known, count the larger possible result.
  const repeatCount =
    decided.playlists === 'include'
      ? counts.repeatCountWithPlaylists
      : decided.playlists === 'skip'
        ? counts.repeatCountWithoutPlaylists
        : Math.max(
            counts.repeatCountWithPlaylists,
            counts.repeatCountWithoutPlaylists,
          );

  if (repeatCount === 0) {
    decided.repeats = 'keep';
  } else if (preferences.repeatedItems === 'ask') {
    dueQuestions.push('repeats');
  } else {
    decided.repeats = preferences.repeatedItems;
  }

  return { decided, dueQuestions, repeatCount };
};
