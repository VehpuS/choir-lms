import {
  scorePartKey,
  type PartSelectionNotice,
  type ResolvedPartSelection,
  type ScorePart,
  type SheetMusicPartSelection,
  type SheetMusicSource,
} from '@org/audio-library-models';

import type {
  PdfRenderFailureReason,
  ScoreRenderFailureReason,
} from '../renderers/sheet-music-renderer';
import type { SheetMusicLoadFailureReason } from '../sheet-music-loader';

export type ViewerFailureReason =
  | PdfRenderFailureReason
  | ScoreRenderFailureReason
  | SheetMusicLoadFailureReason;

export type ViewerFailureAction =
  | 'open-external'
  | 'reconnect-drive'
  | 'save-to-drive'
  | 'try-again';

export type ViewerFailure = {
  actions: ViewerFailureAction[];
  message: string;
  title: string;
};

export const VIEWER_MIN_ZOOM = 0.5;
export const VIEWER_MAX_ZOOM = 3;
export const VIEWER_ZOOM_STEP = 0.25;
export const VIEWER_DEFAULT_ZOOM = 1;

const PERCENT = 100;
const DRIVE_FILE_URL_PREFIX = 'https://drive.google.com/file/d/';
const DRIVE_FILE_URL_SUFFIX = '/view';
export const VOCAL_PRESET_KEY = 'vocal';
export const ALL_PRESET_KEY = 'all';

/** Formats the viewer can draw; a MuseScore file or a plain link opens outside the app. */
export const isViewableSource = (source: SheetMusicSource): boolean => {
  return (
    source.format === 'pdf' ||
    source.format === 'musicxml' ||
    source.format === 'midi'
  );
};

export const filterViewableSources = (
  sources: readonly SheetMusicSource[],
): SheetMusicSource[] => sources.filter(isViewableSource);

/** Where a source can be opened outside the app. */
export const resolveExternalUrl = (source: SheetMusicSource): string => {
  return source.location.kind === 'url'
    ? source.location.url
    : `${DRIVE_FILE_URL_PREFIX}${source.location.fileId}${DRIVE_FILE_URL_SUFFIX}`;
};

export const resolveExternalActionLabel = (
  source: SheetMusicSource,
): string => {
  return source.location.kind === 'url' ? 'Open in browser' : 'Open in Drive';
};

export const VIEWER_ACTION_LABELS: Record<
  Exclude<ViewerFailureAction, 'open-external'>,
  string
> = {
  'reconnect-drive': 'Reconnect Drive',
  'save-to-drive': 'Save to Drive',
  'try-again': 'Try again',
};

/**
 * The message and next steps for a source that did not open. A caller cancel
 * (`aborted`) is not a failure to show, so it has none.
 */
export const describeViewerFailure = (
  reason: ViewerFailureReason,
  source: SheetMusicSource,
): ViewerFailure | undefined => {
  const isDrive = source.location.kind === 'drive';

  switch (reason) {
    case 'aborted':
      return undefined;
    case 'needs-drive-access':
      return {
        actions: ['reconnect-drive'],
        message: 'Reconnect to Google Drive to open this file.',
        title: 'Drive access is needed',
      };
    case 'not-found':
      return {
        actions: ['try-again'],
        message: isDrive
          ? 'It may have been moved or deleted, or you may no longer have access.'
          : 'It may have been moved or deleted.',
        title: 'File not found',
      };
    case 'blocked':
      return {
        actions: ['save-to-drive', 'open-external'],
        message:
          'The app cannot read files from this site. Download the file there and save it to your Google Drive to view it here, or open the link in your browser.',
        title: 'This site does not allow the app to load the file',
      };
    case 'html-page':
      return {
        actions: ['open-external'],
        message:
          'The link opened a web page, such as a sign-in or error page, instead of the file.',
        title: 'This is a web page, not a score',
      };
    case 'not-musicxml':
      return {
        actions: ['open-external'],
        message: 'The file is text, but it is not a MusicXML score.',
        title: 'This is not a MusicXML file',
      };
    case 'unreadable-encoding':
      return {
        actions: ['open-external'],
        message:
          'Export it again as MusicXML in UTF-8 or UTF-16, or as a compressed .mxl file.',
        title: 'The text encoding of this file cannot be read',
      };
    case 'too-large':
      return {
        actions: ['open-external'],
        message: 'Files over 25 MB cannot be loaded here.',
        title: 'This file is too large to open here',
      };
    case 'unsupported':
    case 'wrong-format':
    case 'invalid-score':
    case 'invalid-pdf':
      return {
        actions: ['open-external'],
        message: 'It is not a readable PDF, MusicXML, or MIDI file.',
        title: 'This file cannot be shown',
      };
    case 'password-protected':
      return {
        actions: ['open-external'],
        message: 'Open it outside the app to enter the password.',
        title: 'This PDF is password protected',
      };
    case 'offline':
      return {
        actions: ['try-again'],
        message: isDrive
          ? 'Check your connection and try again.'
          : 'Check the address and your connection, then try again.',
        title: isDrive ? 'No connection' : 'This site could not be reached',
      };
    case 'unavailable':
      return {
        actions: ['try-again', 'open-external'],
        message: 'Something went wrong reaching the file.',
        title: 'The file could not be loaded',
      };
    case 'unsupported-platform':
      return {
        actions: ['open-external'],
        message:
          'Sheet music opens outside the app on iOS and Android for now.',
        title: 'Not shown on this device yet',
      };
  }
};

/**
 * Whether the singer has anything to choose between. A one-part file (a part
 * file such as `...-Alto.mid`, whose single track may be called `Track 1`)
 * shows no chips and no notice: there is nothing to pick, and a notice about
 * unrecognized parts says nothing a singer can act on.
 */
export const hasPartChoice = (parts: readonly ScorePart[]): boolean =>
  parts.length > 1;

export type PartChip = {
  accessibilityLabel: string;
  isOn: boolean;
  key: string;
  label: string;
};

/**
 * The part controls: `Vocal parts` (only when the file has a recognized vocal
 * part), `All parts`, then one toggle per part in score order.
 */
export const buildPartChips = (
  parts: readonly ScorePart[],
  resolved: Pick<ResolvedPartSelection, 'effective' | 'visible'>,
): PartChip[] => {
  const shown = new Set(resolved.visible.map(scorePartKey));
  const presets: PartChip[] = [
    ...(parts.some((part) => part.kind === 'vocal')
      ? [
          {
            accessibilityLabel: 'Show vocal parts',
            isOn: resolved.effective === 'vocal',
            key: VOCAL_PRESET_KEY,
            label: 'Vocal parts',
          },
        ]
      : []),
    {
      accessibilityLabel: 'Show all parts',
      isOn: resolved.effective === 'all',
      key: ALL_PRESET_KEY,
      label: 'All parts',
    },
  ];

  return [
    ...presets,
    ...parts.map((part) => ({
      accessibilityLabel: `${part.name} part`,
      isOn: shown.has(scorePartKey(part)),
      key: scorePartKey(part),
      label: part.name,
    })),
  ];
};

/**
 * The selection to save when a chip is pressed, or undefined for no change
 * (the last visible part cannot be switched off). A set that matches `All
 * parts` or `Vocal parts` is saved as that preset, so the saved choice reads
 * as what the user meant.
 */
export const applyPartChip = (
  parts: readonly ScorePart[],
  resolved: Pick<ResolvedPartSelection, 'visible'>,
  key: string,
): SheetMusicPartSelection | undefined => {
  if (key === VOCAL_PRESET_KEY || key === ALL_PRESET_KEY) {
    return key;
  }

  const shown = new Set(resolved.visible.map(scorePartKey));

  if (shown.has(key)) {
    shown.delete(key);
  } else {
    shown.add(key);
  }

  const next = parts.filter((part) => shown.has(scorePartKey(part)));

  if (next.length === 0) {
    return undefined;
  }

  if (next.length === parts.length) {
    return ALL_PRESET_KEY;
  }

  const vocalSet = parts.filter((part) => part.kind !== 'instrumental');
  const hasVocal = parts.some((part) => part.kind === 'vocal');
  const matchesVocal =
    hasVocal &&
    next.length === vocalSet.length &&
    next.every((part, index) => part === vocalSet[index]);

  return matchesVocal ? VOCAL_PRESET_KEY : { include: next.map(scorePartKey) };
};

const PART_NOTICE_TEXT: Record<PartSelectionNotice, string> = {
  'no-vocal-parts': 'No vocal parts were recognized, so all parts are shown.',
  'saved-parts-missing':
    'Some saved parts were not found in this file, so the vocal parts are shown.',
};

export const describePartNotices = (
  notices: readonly PartSelectionNotice[],
): string[] => notices.map((notice) => PART_NOTICE_TEXT[notice]);

const roundToStep = (zoom: number) => {
  return Math.round(zoom / VIEWER_ZOOM_STEP) * VIEWER_ZOOM_STEP;
};

export const clampViewerZoom = (zoom: number): number => {
  return Math.min(
    VIEWER_MAX_ZOOM,
    Math.max(VIEWER_MIN_ZOOM, roundToStep(zoom)),
  );
};

export const stepViewerZoom = (zoom: number, direction: -1 | 1): number => {
  return clampViewerZoom(roundToStep(zoom) + direction * VIEWER_ZOOM_STEP);
};

export const formatViewerZoom = (zoom: number): string => {
  return `${Math.round(zoom * PERCENT)}%`;
};
