import {
  MAX_SHEET_MUSIC_SOURCES,
  detectSheetMusicFormat,
  normalizeSheetMusicLabel,
  normalizeSheetMusicUrl,
  type SheetMusicFormat,
  type SheetMusicSource,
} from '@org/audio-library-models';

import { isViewableSource, resolveExternalActionLabel } from '../viewer/model';

export const SUPPORTED_FORMATS_MESSAGE =
  'Sheet music can be a PDF, a MusicXML or MIDI file, or a MuseScore file or page.';
export const INVALID_LINK_MESSAGE =
  'Enter a web link that starts with http:// or https://.';
export const LIMIT_MESSAGE = `A track can have up to ${MAX_SHEET_MUSIC_SOURCES} sheet music sources. Remove one to add another.`;
export const MUSESCORE_EXPORT_HINT =
  'Export MusicXML from MuseScore to view it here.';
export const OPENS_OUTSIDE_LABEL = 'Opens outside the app';

const FORMAT_LABELS: Record<SheetMusicFormat, string> = {
  link: 'Link',
  midi: 'MIDI',
  musescore: 'MuseScore',
  musicxml: 'MusicXML',
  pdf: 'PDF',
};
const URL_LAST_SEGMENT_PATTERN = /([^/]+)\/?$/;
const URL_HOST_PATTERN = /^https?:\/\/([^/?#]+)/i;
const EXTENSION_SUFFIX_PATTERN = /\.[a-z0-9]{1,8}$/i;
const NAME_SEPARATOR_PATTERN = /[_]+/g;
const MUSESCORE_PAGE_LABEL = 'MuseScore score';
const MUSESCORE_FILE_PATTERN = /\.(mscz|mscx)$/i;
const QUERY_OR_FRAGMENT_PATTERN = /[?#].*$/;
const URL_SCHEME_AND_HOST_PATTERN = /^https?:\/\/[^/]+/i;

export type SheetMusicRowPresentation = {
  /** The row's main action: `View`, or where it opens outside the app. */
  actionLabel: string;
  canView: boolean;
  /** Format plus, for rows the app cannot show, `Opens outside the app`. */
  detail: string;
  /** Extra guidance for a MuseScore file, which the app cannot read. */
  hint?: string;
};

const readUrlPath = (url: string): string => {
  return url
    .replace(URL_SCHEME_AND_HOST_PATTERN, '')
    .replace(QUERY_OR_FRAGMENT_PATTERN, '');
};

const readFileName = (source: SheetMusicSource): string => {
  return source.location.kind === 'drive'
    ? source.location.name
    : readUrlPath(source.location.url);
};

export const describeSheetMusicRow = (
  source: SheetMusicSource,
): SheetMusicRowPresentation => {
  const canView = isViewableSource(source);
  const formatLabel = FORMAT_LABELS[source.format];
  const isMuseScoreFile =
    source.format === 'musescore' &&
    MUSESCORE_FILE_PATTERN.test(readFileName(source));

  return {
    actionLabel: canView ? 'View' : resolveExternalActionLabel(source),
    canView,
    detail: canView ? formatLabel : `${formatLabel} · ${OPENS_OUTSIDE_LABEL}`,
    ...(isMuseScoreFile ? { hint: MUSESCORE_EXPORT_HINT } : {}),
  };
};

export const hasReachedSheetMusicLimit = (count: number): boolean => {
  return count >= MAX_SHEET_MUSIC_SOURCES;
};

/** A label from a Drive file's name: no extension, `_` read as a space. */
export const suggestLabelFromFileName = (name: string): string => {
  const label = name
    .replace(EXTENSION_SUFFIX_PATTERN, '')
    .replace(NAME_SEPARATOR_PATTERN, ' ');

  return normalizeSheetMusicLabel(label) ?? name;
};

/** A label guessed from the link's file name, or its host when it has none. */
export const suggestLabelFromUrl = (url: string): string => {
  const path = readUrlPath(url);
  const segment = URL_LAST_SEGMENT_PATTERN.exec(path)?.[1];
  const host = URL_HOST_PATTERN.exec(url)?.[1] ?? 'Sheet music';

  if (!segment) {
    return host;
  }

  try {
    const name = decodeURIComponent(segment)
      .replace(EXTENSION_SUFFIX_PATTERN, '')
      .replace(NAME_SEPARATOR_PATTERN, ' ');

    return normalizeSheetMusicLabel(name) ?? host;
  } catch {
    return host;
  }
};

export type LinkAddition = {
  format: SheetMusicFormat;
  label: string;
  location: { kind: 'url'; url: string };
};

export type LinkAdditionResult =
  | { status: 'ready'; addition: LinkAddition }
  | { status: 'refused'; message: string };

/**
 * Turns the pasted link and optional label into an addition, or says why not.
 * Detection happens here, at the boundary, so the viewer only meets known
 * formats (design Decision 9).
 */
export const resolveLinkAddition = (input: {
  label: string;
  url: string;
}): LinkAdditionResult => {
  const url = normalizeSheetMusicUrl(input.url);

  if (!url) {
    return { message: INVALID_LINK_MESSAGE, status: 'refused' };
  }

  const format = detectSheetMusicFormat({ url });

  if (format === 'refused') {
    return { message: SUPPORTED_FORMATS_MESSAGE, status: 'refused' };
  }

  // A MuseScore page's last path segment is a score number, which says nothing.
  const isMuseScorePage =
    format === 'musescore' && !MUSESCORE_FILE_PATTERN.test(readUrlPath(url));
  const suggestedLabel = isMuseScorePage
    ? MUSESCORE_PAGE_LABEL
    : suggestLabelFromUrl(url);

  return {
    addition: {
      format,
      label: normalizeSheetMusicLabel(input.label) ?? suggestedLabel,
      location: { kind: 'url', url },
    },
    status: 'ready',
  };
};
