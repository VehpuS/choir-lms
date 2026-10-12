import {
  MAX_LYRICS_LENGTH,
  normalizeLyricsText,
  type SourceLyrics,
  type SourceLyricsOrigin,
} from '@org/audio-library-models';

import type {
  LyricsCandidate,
  LyricsLookupFailureReason,
} from '../../lyrics-lookup-client';
import { suggestLyricsTitle } from '../../lyrics-search-terms';

export { MAX_LYRICS_LENGTH };

export type LyricsLookupState =
  | { status: 'idle' }
  /** Waiting for the user to acknowledge what a lookup sends. */
  | { status: 'disclosing' }
  | { status: 'loading' }
  | { candidates: LyricsCandidate[]; status: 'candidates' }
  | { reason: LyricsLookupFailureReason; status: 'failed' };

export type LyricsEditorState = {
  artist: string;
  hasAcknowledgedDisclosure: boolean;
  /** The stored lyrics the editor opened with (empty when there are none). */
  initialText: string;
  lookup: LyricsLookupState;
  origin: SourceLyricsOrigin;
  text: string;
  title: string;
};

export type LyricsEditorAction =
  | { artist: string; type: 'artist-changed' }
  | { candidate: LyricsCandidate; type: 'candidate-chosen' }
  | { type: 'disclosure-acknowledged' }
  | { type: 'lookup-dismissed' }
  | { reason: LyricsLookupFailureReason; type: 'lookup-failed' }
  | { type: 'lookup-requested' }
  | { candidates: LyricsCandidate[]; type: 'lookup-succeeded' }
  | { text: string; type: 'text-changed' }
  | { title: string; type: 'title-changed' };

export const createLyricsEditorState = (options: {
  hasAcknowledgedDisclosure: boolean;
  lyrics: SourceLyrics | undefined;
  trackName: string;
}): LyricsEditorState => {
  const text = options.lyrics?.text ?? '';

  return {
    artist: '',
    hasAcknowledgedDisclosure: options.hasAcknowledgedDisclosure,
    initialText: text,
    lookup: { status: 'idle' },
    origin: options.lyrics?.origin ?? 'typed',
    text,
    title: suggestLyricsTitle(options.trackName),
  };
};

export const lyricsEditorReducer = (
  state: LyricsEditorState,
  action: LyricsEditorAction,
): LyricsEditorState => {
  switch (action.type) {
    case 'title-changed':
      return { ...state, title: action.title };
    case 'artist-changed':
      return { ...state, artist: action.artist };
    case 'text-changed':
      // Editing looked-up text makes it the user's own (design Decision 1).
      return { ...state, origin: 'typed', text: action.text };
    case 'lookup-requested':
      return {
        ...state,
        lookup: state.hasAcknowledgedDisclosure
          ? { status: 'loading' }
          : { status: 'disclosing' },
      };
    case 'disclosure-acknowledged':
      return {
        ...state,
        hasAcknowledgedDisclosure: true,
        lookup: { status: 'loading' },
      };
    case 'lookup-succeeded':
      return {
        ...state,
        lookup: { candidates: action.candidates, status: 'candidates' },
      };
    case 'lookup-failed':
      return {
        ...state,
        lookup:
          action.reason === 'aborted'
            ? { status: 'idle' }
            : { reason: action.reason, status: 'failed' },
      };
    case 'lookup-dismissed':
      return { ...state, lookup: { status: 'idle' } };
    case 'candidate-chosen':
      // Loads the text for review only; nothing is stored until Save.
      return {
        ...state,
        lookup: { status: 'idle' },
        origin: 'looked-up',
        text: action.candidate.plainLyrics,
      };
  }
};

export const countLyricsCharacters = (state: LyricsEditorState): number => {
  return normalizeLyricsText(state.text).length;
};

export const isLyricsEditorOverLimit = (state: LyricsEditorState): boolean => {
  return countLyricsCharacters(state) > MAX_LYRICS_LENGTH;
};

export const hasUnsavedLyricsEdits = (state: LyricsEditorState): boolean => {
  return normalizeLyricsText(state.text) !== state.initialText;
};

export const canSaveLyrics = (state: LyricsEditorState): boolean => {
  return hasUnsavedLyricsEdits(state) && !isLyricsEditorOverLimit(state);
};

export const hasStoredLyrics = (state: LyricsEditorState): boolean => {
  return state.initialText.length > 0;
};

export const getLyricsCharacterCountLabel = (
  state: LyricsEditorState,
): string => {
  const count = countLyricsCharacters(state).toLocaleString('en-US');
  const limit = MAX_LYRICS_LENGTH.toLocaleString('en-US');

  return `${count} / ${limit}`;
};

export const getLyricsLookupFailureMessage = (
  reason: Exclude<LyricsLookupFailureReason, 'aborted'>,
): string => {
  switch (reason) {
    case 'no-results':
      return 'No lyrics found. Check the title and artist, search the web, or type them in.';
    case 'offline':
      return 'You appear to be offline. Your text is kept; try again when you are connected.';
    case 'rate-limited':
      return 'The lyrics service asked us to slow down. Try again in a moment.';
    case 'unavailable':
      return 'The lyrics service is not responding. Try again, or search the web instead.';
  }
};

export const getLyricsAttribution = (
  state: LyricsEditorState,
): string | null => {
  return state.origin === 'looked-up' && state.text.length > 0
    ? 'Looked up from the lyrics service. Review before saving.'
    : null;
};

/** Length difference shown on a candidate, e.g. `+3 s`, `-12 s`, or `same length`. */
export const formatCandidateLengthDifference = (
  candidateDurationMs: number | undefined,
  trackDurationMs: number | undefined,
): string | null => {
  if (candidateDurationMs === undefined || trackDurationMs === undefined) {
    return null;
  }

  const seconds = Math.round((candidateDurationMs - trackDurationMs) / 1000);

  if (seconds === 0) {
    return 'same length';
  }

  return `${seconds > 0 ? '+' : '−'}${Math.abs(seconds)} s`;
};
