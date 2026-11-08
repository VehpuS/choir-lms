import {
  checkStemLengths,
  guessStemName,
  isStemNameGuessedFromSection,
  type CompositeDraft,
  STEM_LENGTH_TOLERANCE_MS,
  stemLengthDifferenceSeconds,
  type StorageFit,
} from '@org/audio-library-models';

import { formatDurationLabel } from '../../drive/utils/drive-library-metadata';
import {
  resolveCompositeRoom,
  type CompositeRoomState,
} from '../prepared/composite-room';

/**
 * The create sheet's content (composite-tracks design Decisions 2, 3 and 9):
 * a name, a row per selected track with an editable stem name, the length
 * warning, the first-play note, and the no-room state. Everything here is pure;
 * the sheet view and the state hook sit around it.
 */

export const MAX_COMPOSITE_NAME_LENGTH = 80;
export const MAX_STEM_NAME_LENGTH = 40;

export const CREATE_SHEET_COPY = {
  title: 'New composite',
  subtitle: 'Plays these stems together as one track.',
  nameLabel: 'Name',
  trackColumn: 'Track',
  stemColumn: 'Stem name',
  namedFromTrack: 'named from the track',
  firstPlayNote:
    'The first time it plays, the stems are prepared and loading takes longer. After that it opens quickly.',
  waitingNote: 'Reading the lengths of the tracks…',
  unreadableNote:
    'The length of a track could not be read. Check your connection and try again.',
  createLabel: 'Create',
  cancelLabel: 'Cancel',
  clearOfflineLabel: 'Clear offline files…',
} as const;

const OFFSET_HINT =
  'If a stem starts late instead, set an offset on it after creating.';
const COMMON_PREFIX_MIN_LENGTH = 3;
const DEFAULT_COMPOSITE_NAME = 'New composite';
/** Separators that end a shared lead like `Ubi caritas · `. */
const TRAILING_SEPARATORS_PATTERN = /[\s·\-–—:|/,.()[\]]+$/;
const WHITESPACE_RUN_PATTERN = /\s+/g;

export type CreateSheetTrack = {
  id: string;
  name: string;
  /** Not known yet while the track's length has not been read. */
  durationMs?: number;
};

export type CreateSheetInput = {
  tracks: readonly CreateSheetTrack[];
  /** What the user typed; null until they edit it. */
  compositeName: string | null;
  /** Stem names the user typed, by track id. */
  stemNames: Readonly<Record<string, string>>;
  /** Whether the stems fit in the browser's storage (task 2.7). */
  fit: StorageFit;
  /** Tracks whose length could not be read; waiting on them would never end. */
  unreadableTrackIds?: readonly string[];
};

export type CreateSheetRow = {
  trackId: string;
  trackName: string;
  stemName: string;
  /** `3:19 · 6 s short, padded · named from the track`. */
  meta: string;
};

export type CreateSheetModel = {
  compositeName: string;
  rows: CreateSheetRow[];
  /** The padding warning, when stem lengths differ by more than a second. */
  lengthWarning: string | null;
  firstPlayNote: string;
  /** Shown while a track's length is not known yet. */
  waitingNote: string | null;
  /** Set when a length could not be read: `Create` stays unavailable. */
  unreadableNote: string | null;
  room: CompositeRoomState;
  canCreate: boolean;
};

const collapseWhitespace = (text: string) =>
  text.replace(WHITESPACE_RUN_PATTERN, ' ').trim();

const commonPrefix = (names: readonly string[]): string => {
  const [first = '', ...rest] = names;
  let length = first.length;

  for (const name of rest) {
    let shared = 0;

    while (
      shared < length &&
      shared < name.length &&
      first[shared].toLowerCase() === name[shared].toLowerCase()
    ) {
      shared += 1;
    }

    length = shared;
  }

  return first.slice(0, length);
};

/** The shared lead of the track names (`Ubi caritas`), or a plain default. */
export const getDefaultCompositeName = (
  trackNames: readonly string[],
): string => {
  const lead = collapseWhitespace(
    commonPrefix(trackNames).replace(TRAILING_SEPARATORS_PATTERN, ''),
  );

  return lead.length >= COMMON_PREFIX_MIN_LENGTH
    ? lead.slice(0, MAX_COMPOSITE_NAME_LENGTH)
    : DEFAULT_COMPOSITE_NAME;
};

const getStemName = (track: CreateSheetTrack, typed: string | undefined) =>
  typed ?? guessStemName(track.name);

const describeLengthWarning = (
  shorter: readonly CreateSheetRow[],
): string | null => {
  const [only] = shorter;

  if (!only) {
    return null;
  }

  return shorter.length === 1
    ? `${collapseWhitespace(only.stemName) || only.trackName} is shorter than the others, so it is padded with silence at the end. ${OFFSET_HINT}`
    : `${shorter.length} stems are shorter than the longest, so they are padded with silence at the end. ${OFFSET_HINT}`;
};

export const resolveCreateSheetModel = (
  input: CreateSheetInput,
): CreateSheetModel => {
  const lengths = checkStemLengths(input.tracks.map((t) => t.durationMs));
  const longest = Math.max(0, ...input.tracks.map((t) => t.durationMs ?? 0));
  const shorterRows: CreateSheetRow[] = [];
  const rows = input.tracks.map((track): CreateSheetRow => {
    const typed = input.stemNames[track.id];
    const parts: string[] = [];
    const duration = formatDurationLabel(track.durationMs);
    // Unknown lengths are handled by the waiting state, not called short.
    const missingMs =
      track.durationMs === undefined ? 0 : longest - track.durationMs;
    const isShort = missingMs > STEM_LENGTH_TOLERANCE_MS;

    if (duration) {
      parts.push(duration);
    }

    if (isShort) {
      parts.push(`${stemLengthDifferenceSeconds(missingMs)} s short, padded`);
    }

    // Only a name still taken from the track is described as such.
    if (typed === undefined && !isStemNameGuessedFromSection(track.name)) {
      parts.push(CREATE_SHEET_COPY.namedFromTrack);
    }

    const row: CreateSheetRow = {
      trackId: track.id,
      trackName: track.name,
      stemName: getStemName(track, typed),
      meta: parts.join(' · '),
    };

    if (isShort) {
      shorterRows.push(row);
    }

    return row;
  });
  const room = resolveCompositeRoom({ fit: input.fit });
  const hasUnreadable = input.tracks.some(
    (track) =>
      track.durationMs === undefined &&
      input.unreadableTrackIds?.includes(track.id),
  );

  return {
    compositeName:
      input.compositeName ??
      getDefaultCompositeName(input.tracks.map((track) => track.name)),
    rows,
    lengthWarning: describeLengthWarning(shorterRows),
    firstPlayNote: CREATE_SHEET_COPY.firstPlayNote,
    waitingNote:
      lengths.waiting && !hasUnreadable ? CREATE_SHEET_COPY.waitingNote : null,
    unreadableNote: hasUnreadable ? CREATE_SHEET_COPY.unreadableNote : null,
    room,
    canCreate: !lengths.waiting && room.kind === 'ok',
  };
};

/**
 * What `Create` saves: names trimmed and bounded, an emptied name falling back
 * to the guess so a stem or the composite is never nameless.
 */
export const buildCompositeDraft = (
  input: CreateSheetInput,
): CompositeDraft => {
  const model = resolveCreateSheetModel(input);
  const named = (typed: string, fallback: string, limit: number) =>
    (collapseWhitespace(typed) || fallback).slice(0, limit);

  return {
    name: named(
      model.compositeName,
      getDefaultCompositeName(input.tracks.map((track) => track.name)),
      MAX_COMPOSITE_NAME_LENGTH,
    ),
    stems: input.tracks.map((track, index) => ({
      trackId: track.id,
      name: named(
        model.rows[index].stemName,
        guessStemName(track.name),
        MAX_STEM_NAME_LENGTH,
      ),
    })),
  };
};
