import type {
  BulkChoiceCounts,
  BulkChoicePreferences,
  BulkChoiceQuestion,
  BulkChoiceResolution,
} from '../bulk-choices';
import type {
  PlaybackExpansionOptions,
  PlaylistsInFoldersChoice,
  RepeatedItemsChoice,
} from '../playback-expansion';

export type BulkChoiceAnswers = {
  playlists: PlaylistsInFoldersChoice;
  repeats: RepeatedItemsChoice;
};

/**
 * What each question starts on. These match the behavior before the prompt
 * existed (skip playlists, keep repeats), so confirming without touching
 * anything never adds or removes items the user did not choose.
 */
export const DEFAULT_PROMPT_ANSWERS: BulkChoiceAnswers = {
  playlists: 'skip',
  repeats: 'keep',
};

export type PromptQuestionCopy = {
  body: string;
  options: ReadonlyArray<{ label: string; value: string }>;
  question: BulkChoiceQuestion;
  title: string;
};

export type BulkChoicesPromptCopy = {
  cancelLabel: string;
  confirmLabel: string;
  questions: PromptQuestionCopy[];
  rememberLabel: string;
};

const pluralize = (count: number, one: string, many: string) => {
  return `${count} ${count === 1 ? one : many}`;
};

export const getBulkChoicesPromptCopy = (options: {
  dueQuestions: readonly BulkChoiceQuestion[];
  playlistLinkCount: BulkChoiceCounts['playlistLinkCount'];
  repeatCount: BulkChoiceResolution['repeatCount'];
}): BulkChoicesPromptCopy => {
  const questions = options.dueQuestions.map((question): PromptQuestionCopy => {
    if (question === 'playlists') {
      return {
        body: `${pluralize(options.playlistLinkCount, 'playlist is', 'playlists are')} in the selected folders.`,
        options: [
          { label: 'Include playlists', value: 'include' },
          { label: 'Skip playlists', value: 'skip' },
        ],
        question,
        title: 'Include playlists?',
      };
    }

    return {
      body: `${pluralize(options.repeatCount, 'item repeats', 'items repeat')}.`,
      options: [
        { label: 'Keep repeats', value: 'keep' },
        { label: 'Remove repeats', value: 'remove' },
      ],
      question,
      title: 'Keep repeats?',
    };
  });

  return {
    cancelLabel: 'Cancel',
    confirmLabel: 'Continue',
    questions,
    rememberLabel: 'Remember my choice',
  };
};

/**
 * The expansion options for the action, and the preferences to store. Only the
 * questions that were asked can be remembered; a stored default or a question
 * that did not arise is never overwritten by this prompt.
 */
export const resolvePromptOutcome = (options: {
  answers: BulkChoiceAnswers;
  decided: BulkChoiceResolution['decided'];
  dueQuestions: readonly BulkChoiceQuestion[];
  preferences: BulkChoicePreferences;
  remember: boolean;
}): {
  expansionOptions: PlaybackExpansionOptions;
  preferences: BulkChoicePreferences;
} => {
  const isDue = (question: BulkChoiceQuestion) => {
    return options.dueQuestions.includes(question);
  };

  return {
    expansionOptions: {
      playlists: options.decided.playlists ?? options.answers.playlists,
      repeats: options.decided.repeats ?? options.answers.repeats,
    },
    preferences: {
      playlistsInFolders:
        options.remember && isDue('playlists')
          ? options.answers.playlists
          : options.preferences.playlistsInFolders,
      repeatedItems:
        options.remember && isDue('repeats')
          ? options.answers.repeats
          : options.preferences.repeatedItems,
    },
  };
};
