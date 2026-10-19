import {
  suggestLyricsQuery,
  type LyricsQuerySuggestion,
} from '../lyrics/lyrics-search-terms';

/** The Title and Artist shown in the add flow before the user edits them, from the track name. */
export type SheetMusicSearchSuggestion = LyricsQuerySuggestion;

export const suggestSheetMusicQuery = suggestLyricsQuery;
