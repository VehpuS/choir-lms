import { take, uniqBy } from 'es-toolkit';

export const MAX_SHEET_MUSIC_SOURCES = 10;
export const MAX_SHEET_MUSIC_LABEL_LENGTH = 60;

export type SheetMusicFormat =
  | 'pdf'
  | 'musicxml'
  | 'midi'
  | 'musescore'
  | 'link';

export type SheetMusicLocation =
  | { kind: 'drive'; fileId: string; name: string }
  | { kind: 'url'; url: string };

export type SheetMusicPartSelection = 'vocal' | 'all' | { include: string[] };

/**
 * How the web viewer lays out a PDF's pages. `spread` shows two pages side by
 * side and is offered only where the viewer is wide enough.
 */
export type PdfLayout = 'scroll' | 'pages' | 'strip' | 'spread';

export const DEFAULT_PDF_LAYOUT: PdfLayout = 'scroll';

/** A link to one score or part file for a track; the file itself is never stored. */
export type SheetMusicSource = {
  id: string;
  label: string;
  location: SheetMusicLocation;
  format: SheetMusicFormat;
  partSelection?: SheetMusicPartSelection;
  /** This file's own PDF layout; when absent the device layout applies. */
  pdfLayout?: PdfLayout;
  addedAt: string;
};

export type SheetMusicDetectionInput = {
  name?: string;
  mimeType?: string;
  url?: string;
};

/** `refused` means the add flow should name the supported formats and stop. */
export type SheetMusicDetection = SheetMusicFormat | 'refused';

const EXTENSION_FORMATS: Record<string, SheetMusicFormat> = {
  pdf: 'pdf',
  // A bare `.xml` can only be confirmed as MusicXML by reading it, which the
  // loader does; at add time it is treated as MusicXML.
  xml: 'musicxml',
  musicxml: 'musicxml',
  mxl: 'musicxml',
  mid: 'midi',
  midi: 'midi',
  mscz: 'musescore',
  mscx: 'musescore',
};

// Drive often reports generic types for these, so extension wins over MIME.
const MIME_FORMATS: Record<string, SheetMusicFormat> = {
  'application/pdf': 'pdf',
  'application/vnd.recordare.musicxml': 'musicxml',
  'application/vnd.recordare.musicxml+xml': 'musicxml',
  'audio/midi': 'midi',
  'audio/mid': 'midi',
  'audio/x-midi': 'midi',
  'audio/sp-midi': 'midi',
  'application/x-musescore': 'musescore',
};

const HTTP_URL_PATTERN = /^(https?):\/\/([^/?#\s]+)([^?#]*)/i;
const CONTAINS_WHITESPACE_PATTERN = /\s/;
const URL_USERINFO_PATTERN = /^[^@]*@/;
const URL_PORT_PATTERN = /:\d*$/;
const WHITESPACE_RUN_PATTERN = /\s+/g;
const EXTENSION_PATTERN = /\.([a-z0-9]{1,8})$/i;
const MUSESCORE_HOST_PATTERN = /(^|\.)musescore\.com$/i;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

// Hand-parsed rather than `new URL(...)`: this package stays framework-agnostic
// and React Native's URL implementation has been partial.
const splitHttpUrl = (
  url: string,
): { host: string; pathname: string } | undefined => {
  const match = HTTP_URL_PATTERN.exec(url);

  if (!match || CONTAINS_WHITESPACE_PATTERN.test(url)) {
    return undefined;
  }

  const host = (match[2] ?? '')
    .replace(URL_USERINFO_PATTERN, '')
    .replace(URL_PORT_PATTERN, '');

  return host.length === 0 ? undefined : { host, pathname: match[3] ?? '' };
};

/** Trims a pasted link and keeps it only when it is a usable http(s) URL. */
export const normalizeSheetMusicUrl = (value: string): string | undefined => {
  const url = value.trim();

  return splitHttpUrl(url) ? url : undefined;
};

export const normalizeSheetMusicLabel = (value: string): string | undefined => {
  const label = value
    .replace(WHITESPACE_RUN_PATTERN, ' ')
    .trim()
    .slice(0, MAX_SHEET_MUSIC_LABEL_LENGTH)
    .trim();

  return label.length === 0 ? undefined : label;
};

const readExtension = (path: string | undefined): string | undefined => {
  return EXTENSION_PATTERN.exec(path ?? '')?.[1]?.toLowerCase();
};

/**
 * Decides what a Drive file or a pasted link is, from its name, MIME type, or
 * URL path. Pure and used where a source is added so the viewer only ever
 * receives a known format.
 */
export const detectSheetMusicFormat = (
  input: SheetMusicDetectionInput,
): SheetMusicDetection => {
  const url =
    input.url === undefined ? undefined : splitHttpUrl(input.url.trim());

  if (input.url !== undefined && !url) {
    return 'refused';
  }

  if (url && MUSESCORE_HOST_PATTERN.test(url.host)) {
    return 'musescore';
  }

  const extension = readExtension(input.name) ?? readExtension(url?.pathname);

  if (extension !== undefined) {
    return EXTENSION_FORMATS[extension] ?? 'refused';
  }

  const mimeFormat = MIME_FORMATS[(input.mimeType ?? '').toLowerCase()];

  if (mimeFormat) {
    return mimeFormat;
  }

  // A link with no clear extension (a download endpoint, say) is kept and
  // opened outside the app; a Drive file we cannot identify is refused.
  return url ? 'link' : 'refused';
};

/** Builds a source from add-flow input; undefined when it should be refused. */
export const createSheetMusicSource = (options: {
  addedAt: string;
  format: SheetMusicFormat;
  id: string;
  label: string;
  location: SheetMusicLocation;
  partSelection?: SheetMusicPartSelection;
  pdfLayout?: PdfLayout;
}): SheetMusicSource | undefined => {
  const label = normalizeSheetMusicLabel(options.label);
  const location = parseLocation(options.location);

  if (!label || !location || !isNonEmptyString(options.id)) {
    return undefined;
  }

  return {
    id: options.id,
    label,
    location,
    format: options.format,
    ...(options.partSelection ? { partSelection: options.partSelection } : {}),
    ...(options.pdfLayout ? { pdfLayout: options.pdfLayout } : {}),
    addedAt: options.addedAt,
  };
};

const parseLocation = (value: unknown): SheetMusicLocation | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    value.kind === 'drive' &&
    isNonEmptyString(value.fileId) &&
    typeof value.name === 'string'
  ) {
    return { kind: 'drive', fileId: value.fileId, name: value.name };
  }

  if (value.kind === 'url' && typeof value.url === 'string') {
    const url = normalizeSheetMusicUrl(value.url);

    return url ? { kind: 'url', url } : undefined;
  }

  return undefined;
};

const isFormat = (value: unknown): value is SheetMusicFormat => {
  return (
    value === 'pdf' ||
    value === 'musicxml' ||
    value === 'midi' ||
    value === 'musescore' ||
    value === 'link'
  );
};

/** Reads a stored layout; anything but a known layout is `undefined`. */
export const parsePdfLayout = (value: unknown): PdfLayout | undefined => {
  return value === 'scroll' ||
    value === 'pages' ||
    value === 'strip' ||
    value === 'spread'
    ? value
    : undefined;
};

/** A file's own layout, else the device layout, else `scroll`. */
export const resolvePdfLayout = (
  source: Pick<SheetMusicSource, 'pdfLayout'> | undefined,
  devicePreference: PdfLayout | undefined,
): PdfLayout => {
  return source?.pdfLayout ?? devicePreference ?? DEFAULT_PDF_LAYOUT;
};

const parsePartSelection = (
  value: unknown,
): SheetMusicPartSelection | undefined => {
  if (value === 'vocal' || value === 'all') {
    return value;
  }

  if (!isRecord(value) || !Array.isArray(value.include)) {
    return undefined;
  }

  const include = value.include.filter(isNonEmptyString);

  return include.length === 0 ? undefined : { include };
};

const parseSheetMusicSource = (
  value: unknown,
): SheetMusicSource | undefined => {
  if (!isRecord(value) || !isFormat(value.format)) {
    return undefined;
  }

  if (!isNonEmptyString(value.addedAt) || typeof value.label !== 'string') {
    return undefined;
  }

  // A bad part selection or layout only resets to the default; it never drops
  // the link.
  return createSheetMusicSource({
    id: typeof value.id === 'string' ? value.id : '',
    label: value.label,
    location: value.location as SheetMusicLocation,
    format: value.format,
    partSelection: parsePartSelection(value.partSelection),
    pdfLayout: parsePdfLayout(value.pdfLayout),
    addedAt: value.addedAt,
  });
};

/**
 * Reads a stored `sheetMusic` value. A malformed entry is dropped (and so is a
 * duplicate id or anything past the cap) rather than failing the read of the
 * whole track; an empty result removes the field.
 */
export const parseSourceSheetMusic = (
  value: unknown,
): SheetMusicSource[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const sources = uniqBy(
    value.flatMap((entry) => parseSheetMusicSource(entry) ?? []),
    (source) => source.id,
  );

  return sources.length === 0
    ? undefined
    : take(sources, MAX_SHEET_MUSIC_SOURCES);
};
