import type { Recording } from '@org/audio-library-models';
import {
  formatRecordingSize,
  getRecordingExports,
} from '@org/audio-library-models';
import type { LibraryBundleImportPlan } from '@org/audio-library-runtime';
import type { DriveBundleListing } from '@org/google-drive';

import type { BundlePhase } from './bundle-service-types';

/**
 * Pure view models for the Backup, Restore, Share and Import sheets: what each
 * row, count tile, confirmation and progress line says. The sheets only render
 * these, so the wording is proven here.
 */

const SHARE_PREFIX_PATTERN = /^choir-lms-share-/;
const STAMP_SUFFIX_PATTERN = / \d{4}-\d{2}-\d{2}T\d{4}\.json$/;
const JSON_SUFFIX_PATTERN = /\.json$/;

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** `9 Nov 2026, 15:30`, in the device's time zone. */
export const formatBundleDate = (iso: string | undefined): string => {
  const date = iso ? new Date(iso) : null;

  return date && !Number.isNaN(date.getTime()) ? dateFormat.format(date) : '';
};

export const pluralize = (
  count: number,
  singular: string,
  plural = `${singular}s`,
) => `${count} ${count === 1 ? singular : plural}`;

export type RestoreRow = {
  id: string;
  title: string;
  meta: string;
  /** `Undo` marks a safety backup written before a replace. */
  tag?: 'Undo';
  listing: DriveBundleListing;
};

const countsLine = (listing: DriveBundleListing) => {
  const parts = listing.counts
    ? [
        pluralize(listing.counts.tracks, 'track'),
        pluralize(listing.counts.loops, 'loop'),
        pluralize(listing.counts.playlists, 'playlist'),
      ]
    : listing.sizeBytes !== undefined
      ? [formatRecordingSize(listing.sizeBytes)]
      : [];

  return parts.join(' · ');
};

/** The user's own backups, newest first, pre-restore backups tagged so Undo is findable. */
export const buildRestoreRows = (
  bundles: readonly DriveBundleListing[],
): RestoreRow[] =>
  bundles
    .filter(
      (bundle) =>
        bundle.origin === 'mine' &&
        (bundle.kind === 'backup' || bundle.kind === 'pre-restore'),
    )
    .map((listing) => ({
      id: listing.id,
      title: `${listing.kind === 'pre-restore' ? 'Before restore' : 'Backup'} · ${formatBundleDate(listing.modifiedTime)}`,
      meta: countsLine(listing),
      ...(listing.kind === 'pre-restore' ? { tag: 'Undo' as const } : {}),
      listing,
    }));

export type ImportRow = {
  id: string;
  title: string;
  meta: string;
  listing: DriveBundleListing;
};

/** A share's file name without its prefix and stamp: the folder name the sender chose. */
export const readableBundleName = (fileName: string): string =>
  fileName
    .replace(SHARE_PREFIX_PATTERN, '')
    .replace(STAMP_SUFFIX_PATTERN, '')
    .replace(JSON_SUFFIX_PATTERN, '');

const toImportRow = (listing: DriveBundleListing): ImportRow => {
  const who =
    listing.origin === 'shared'
      ? (listing.owner?.name ?? 'Shared with you')
      : 'Your backup';

  return {
    id: listing.id,
    title:
      listing.kind === 'share'
        ? readableBundleName(listing.name)
        : `${listing.kind === 'pre-restore' ? 'Before restore' : 'Backup'} · ${formatBundleDate(listing.modifiedTime)}`,
    meta: [
      who,
      listing.kind === 'share' ? formatBundleDate(listing.modifiedTime) : '',
      countsLine(listing),
    ]
      .filter(Boolean)
      .join(' · '),
    listing,
  };
};

/** The import list in two groups, as the sheet shows them. */
export const buildImportRows = (bundles: readonly DriveBundleListing[]) => ({
  shared: bundles.filter((b) => b.origin === 'shared').map(toImportRow),
  mine: bundles.filter((b) => b.origin === 'mine').map(toImportRow),
});

export type RecordingPickerRow = {
  id: string;
  title: string;
  detail: string;
  checked: boolean;
};

const hasDriveCopy = (recording: Recording) =>
  getRecordingExports(recording).done.some(
    (entry) => entry.kind === 'recording',
  );

/** Audio the safety backup would upload: every recording that has no Drive copy yet. */
export const sumRecordingUploadBytes = (
  recordings: readonly Recording[],
): number =>
  recordings
    .filter((recording) => !hasDriveCopy(recording))
    .reduce((total, recording) => total + recording.sizeBytes, 0);

/** Recordings are never preselected; the detail says whether choosing one uploads audio. */
export const buildRecordingPicker = (
  recordings: readonly Recording[],
  selectedIds: ReadonlySet<string>,
) => {
  const rows: RecordingPickerRow[] = recordings.map((recording) => ({
    id: recording.id,
    title: `${recording.name} · ${recording.source.name}`,
    detail: hasDriveCopy(recording)
      ? 'On Drive already · no upload'
      : `${formatRecordingSize(recording.sizeBytes)} · will upload`,
    checked: selectedIds.has(recording.id),
  }));
  const uploadBytes = recordings
    .filter(
      (recording) => selectedIds.has(recording.id) && !hasDriveCopy(recording),
    )
    .reduce((total, recording) => total + recording.sizeBytes, 0);
  const anySelected = rows.some((row) => row.checked);

  return {
    rows,
    uploadBytes,
    totalLabel: !anySelected
      ? 'No audio will be uploaded.'
      : uploadBytes === 0
        ? 'Included. Already on Drive, so nothing extra uploads.'
        : `${formatRecordingSize(uploadBytes)} of recording audio will be uploaded.`,
  };
};

export type CountTile = { label: string; value: number; tone?: 'ok' | 'warn' };

/** What an import preview adds, reuses and warns about. */
export const buildImportPreviewTiles = (
  plan: LibraryBundleImportPlan,
  droppedTotal: number,
): { tiles: CountTile[]; droppedLine: string | null } => {
  const { summary } = plan;
  const tiles: CountTile[] = [
    { label: 'new tracks', value: summary.newTracks, tone: 'ok' },
    { label: 'already yours', value: summary.reusedTracks },
    { label: 'loops', value: summary.loops },
    { label: 'playlists', value: summary.playlists },
    { label: 'composites', value: summary.composites },
    ...(summary.needsAccessTracks > 0
      ? [
          {
            label: 'need access',
            value: summary.needsAccessTracks,
            tone: 'warn' as const,
          },
        ]
      : []),
  ];

  return {
    tiles,
    droppedLine:
      droppedTotal > 0
        ? `${pluralize(droppedTotal, 'damaged item')} ${droppedTotal === 1 ? 'was' : 'were'} skipped.`
        : null,
  };
};

export const SHARE_OUTSIDE_COPY = {
  label: 'Include the items its playlists use from other folders',
  warning: 'Everyone who opens the file sees their names and tags.',
} as const;

/** The two states of the share preview's warning card. */
export const describeShareLeftOut = (options: {
  includeOutside: boolean;
  leftOutReferenceCount: number;
  outsideItemCount: number;
}) =>
  options.includeOutside
    ? {
        tone: 'ok' as const,
        headline: 'Nothing is left out.',
        detail: `${pluralize(options.outsideItemCount, 'item')} from other folders ${options.outsideItemCount === 1 ? 'is' : 'are'} added so playlists and composites are complete.`,
      }
    : options.leftOutReferenceCount > 0
      ? {
          tone: 'warn' as const,
          headline: `${pluralize(options.leftOutReferenceCount, 'reference')} to items outside this folder ${options.leftOutReferenceCount === 1 ? 'was' : 'were'} left out.`,
          detail: 'Playlists and composites that use them will have gaps.',
        }
      : null;

export const describeReplaceConfirmation = (options: {
  counts: {
    tracks: number;
    loops: number;
    playlists: number;
    recordings: number;
  };
  isOwn: boolean;
  authorName: string;
  uploadBytes: number;
}) => ({
  headline: 'Everything in your library will be replaced',
  contents: `The ${options.isOwn ? 'backup' : 'bundle'} holds ${[
    pluralize(options.counts.tracks, 'track'),
    pluralize(options.counts.loops, 'loop'),
    pluralize(options.counts.playlists, 'playlist'),
  ].join(', ')}.`,
  ...(options.isOwn
    ? {}
    : { fromLine: `It comes from ${options.authorName}, not from you.` }),
  safety: `First, a backup of your current library — including all your recordings${
    options.uploadBytes > 0
      ? ` (${formatRecordingSize(options.uploadBytes)} to upload)`
      : ''
  } — is saved to “Choir LMS / Backups”. If that fails, nothing changes.`,
  confirmLabel: 'Back up, then replace',
});

export type PhaseLine = { label: string; state: 'done' | 'now' | 'next' };

const PHASE_ORDER: Record<'backup' | 'replace' | 'share', BundlePhase[]> = {
  backup: ['folders', 'reading', 'recordings', 'uploading', 'pruning'],
  replace: ['safety-backup', 'replacing', 'restoring-recordings'],
  share: ['folders', 'reading', 'recordings', 'uploading'],
};

const PHASE_LABEL: Record<BundlePhase, string> = {
  folders: 'Folders ready',
  reading: 'Reading your library',
  recordings: 'Uploading recording audio',
  uploading: 'Uploading the library file',
  pruning: 'Removing backups beyond 5',
  'restoring-recordings': 'Restoring recordings from Drive',
  'safety-backup': 'Saving a backup of your current library',
  replacing: 'Replacing your library',
};

/** The progress list: finished steps, the current one, and what is next. */
export const buildPhaseLines = (
  flow: keyof typeof PHASE_ORDER,
  current: BundlePhase | null,
  options: { includesRecordings: boolean },
): PhaseLine[] => {
  const phases = PHASE_ORDER[flow].filter(
    (phase) =>
      (phase !== 'recordings' && phase !== 'restoring-recordings') ||
      options.includesRecordings,
  );
  const currentIndex = current ? phases.indexOf(current) : -1;

  return phases.map((phase, index) => ({
    label: PHASE_LABEL[phase],
    state:
      index < currentIndex ? 'done' : index === currentIndex ? 'now' : 'next',
  }));
};

export type RecordingRestoreChoice =
  | { kind: 'choice'; title: string; detail: string }
  | { kind: 'note'; text: string };

/**
 * What the preview and the Replace confirmation say about a bundle's
 * recordings: a checkbox where they can be restored, a plain note where they
 * cannot (a phone has no recordings store yet), nothing when there are none.
 */
export const describeRecordingRestoreChoice = (options: {
  count: number;
  bytes: number;
  supported: boolean;
}): RecordingRestoreChoice | null => {
  if (options.count === 0) {
    return null;
  }

  return options.supported
    ? {
        kind: 'choice',
        title: `Also restore ${pluralize(options.count, 'recording')}`,
        detail: `Downloads ${formatRecordingSize(options.bytes)} of audio from Drive. Off by default.`,
      }
    : {
        kind: 'note',
        text: `${pluralize(options.count, 'recording')} in this file can’t be restored on this device yet. They stay in the file on Drive.`,
      };
};

/** A line for the finished sheet; null when nothing about recordings needs saying. */
export const describeRecordingRestoreOutcome = (
  outcome: {
    restored: number;
    alreadyHere: number;
    failed: number;
    cancelled: boolean;
  } | null,
): string | null => {
  if (
    !outcome ||
    outcome.restored + outcome.alreadyHere + outcome.failed === 0
  ) {
    return outcome?.cancelled ? 'Recordings were not restored.' : null;
  }

  const parts = [
    `${pluralize(outcome.restored + outcome.alreadyHere, 'recording')} restored`,
    outcome.failed > 0 ? `${outcome.failed} couldn’t be restored` : null,
    outcome.cancelled ? 'stopped before the rest' : null,
  ].filter(Boolean);

  return `${parts.join('; ')}.`;
};
