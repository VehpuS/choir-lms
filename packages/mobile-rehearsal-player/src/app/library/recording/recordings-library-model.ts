import {
  getRecordedTrackRange,
  isWholeTrackRecording,
  type Recording,
} from '@org/audio-library-models';
import { orderBy, uniqBy } from 'es-toolkit';

import {
  recordingNeedsConnection,
  type RecordingOfflineContext,
} from './recording-offline';
import {
  isOriginalChanged,
  toRecordingRow,
  type RecordingRow,
} from './recordings-panel-model';

/**
 * What the Library's `Recordings` view lists (rehearsal-recording design
 * Decision 15): every recording on the device, searched, filtered and sorted,
 * with a row per recording. A projection of the recordings store; recordings
 * are never library files.
 */

export const RECORDINGS_VIEW_TITLE = 'Recordings';
export const EMPTY_LIBRARY_TITLE = 'No recordings yet';
export const EMPTY_LIBRARY_MESSAGE =
  'Open a track, turn on “Recording” in “Practice tools”, and press “Record”.';
export const NO_MATCHES_MESSAGE = 'No recordings match.';

export type RecordingsSort = 'newest' | 'track' | 'length' | 'name';
export type RecordingKindFilter = 'whole' | 'segment' | 'loop' | 'adjusted';
export type RecordingDriveFilter = 'on-drive' | 'not-on-drive';

/** Whether a recording has been exported to Drive (the export record arrives with task 10.4). */
export type RecordingExportStatus = 'on-drive' | 'pending' | 'failed' | 'none';

export type RecordingsFilters = {
  kind?: RecordingKindFilter;
  drive?: RecordingDriveFilter;
  originalChanged?: boolean;
  needsConnection?: boolean;
  /** `lineage.track.id` of the track to show. */
  trackId?: string;
};

export type RecordingsLibraryInput = {
  recordings: readonly Recording[];
  query: string;
  filters: RecordingsFilters;
  sort: RecordingsSort;
  offline: RecordingOfflineContext;
  /** Export status per recording; the view reads `none` until task 10.4. */
  exportStatusOf: (recordingId: string) => RecordingExportStatus;
  now: Date;
};

export type LibraryRecordingRow = RecordingRow & {
  trackName: string;
  exportStatus: RecordingExportStatus;
  /** `On Drive`, `Upload pending`, `Upload failed`; absent when never exported. */
  driveLabel?: string;
};

export type RecordingTrackOption = {
  trackId: string;
  name: string;
  count: number;
};

export type RecordingsLibraryModel = {
  rows: LibraryRecordingRow[];
  /** Every track that has a recording, for the track filter. */
  trackOptions: RecordingTrackOption[];
  total: number;
  activeFilterCount: number;
  emptyMessage: string | null;
};

const DRIVE_LABELS: Record<RecordingExportStatus, string | undefined> = {
  'on-drive': 'On Drive',
  pending: 'Upload pending',
  failed: 'Upload failed',
  none: undefined,
};

export const matchesKind = (
  recording: Recording,
  kind: RecordingKindFilter,
): boolean => {
  const { adjusted, loop } = recording.lineage;

  if (kind === 'loop') {
    return loop !== undefined;
  }

  if (kind === 'adjusted') {
    return adjusted !== undefined;
  }

  // Whole track and segment describe recordings of the track itself, not its loops.
  if (loop) {
    return false;
  }

  return kind === 'whole'
    ? isWholeTrackRecording(recording)
    : !isWholeTrackRecording(recording);
};

/** Names of the markers inside the track range the recording covers. */
const markerNamesInSpan = (recording: Recording): string[] => {
  const range = getRecordedTrackRange(recording);

  if (!range) {
    return [];
  }

  return recording.markers
    .filter(
      (marker) =>
        marker.positionMs >= range.startMs && marker.positionMs <= range.endMs,
    )
    .map((marker) => marker.name);
};

/** Search by recording name, track title, loop name and marker names in the span. */
export const matchesRecordingQuery = (
  recording: Recording,
  query: string,
): boolean => {
  const needle = query.trim().toLowerCase();

  if (needle === '') {
    return true;
  }

  return [
    recording.name,
    recording.lineage.track.name,
    recording.lineage.loop?.name ?? '',
    ...markerNamesInSpan(recording),
  ].some((text) => text.toLowerCase().includes(needle));
};

const matchesFilters = (
  recording: Recording,
  filters: RecordingsFilters,
  input: RecordingsLibraryInput,
): boolean => {
  const onDrive = input.exportStatusOf(recording.id) === 'on-drive';

  return (
    (!filters.kind || matchesKind(recording, filters.kind)) &&
    (filters.drive !== 'on-drive' || onDrive) &&
    (filters.drive !== 'not-on-drive' || !onDrive) &&
    (!filters.originalChanged ||
      isOriginalChanged(recording, input.offline.sources)) &&
    (!filters.needsConnection ||
      recordingNeedsConnection(recording, input.offline.stateOf)) &&
    (!filters.trackId || recording.lineage.track.id === filters.trackId)
  );
};

export const countActiveFilters = (filters: RecordingsFilters): number => {
  return [
    filters.kind,
    filters.drive,
    filters.originalChanged || undefined,
    filters.needsConnection || undefined,
    filters.trackId,
  ].filter((value) => value !== undefined).length;
};

const sortRecordings = (
  recordings: Recording[],
  sort: RecordingsSort,
): Recording[] => {
  const newest = (recording: Recording) => recording.createdAt;

  switch (sort) {
    case 'track':
      return orderBy(
        recordings,
        [(r) => r.lineage.track.name.toLowerCase(), newest],
        ['asc', 'desc'],
      );
    case 'length':
      return orderBy(
        recordings,
        [(r) => r.durationMs, newest],
        ['desc', 'desc'],
      );
    case 'name':
      return [...recordings].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      );
    default:
      return orderBy(recordings, [newest], ['desc']);
  }
};

const getTrackOptions = (
  recordings: readonly Recording[],
): RecordingTrackOption[] => {
  const options = uniqBy(recordings, (r) => r.lineage.track.id).map((r) => ({
    trackId: r.lineage.track.id,
    name: r.lineage.track.name,
    count: recordings.filter(
      (other) => other.lineage.track.id === r.lineage.track.id,
    ).length,
  }));

  return orderBy(options, [(option) => option.name.toLowerCase()], ['asc']);
};

export const getRecordingsLibraryModel = (
  input: RecordingsLibraryInput,
): RecordingsLibraryModel => {
  const matching = input.recordings.filter(
    (recording) =>
      matchesRecordingQuery(recording, input.query) &&
      matchesFilters(recording, input.filters, input),
  );
  const rows = sortRecordings(matching, input.sort).map((recording) => {
    const exportStatus = input.exportStatusOf(recording.id);

    return {
      ...toRecordingRow(recording, input.offline, input.now),
      trackName: recording.lineage.track.name,
      exportStatus,
      driveLabel: DRIVE_LABELS[exportStatus],
    };
  });
  let emptyMessage: string | null = null;

  if (input.recordings.length === 0) {
    emptyMessage = EMPTY_LIBRARY_MESSAGE;
  } else if (rows.length === 0) {
    emptyMessage = NO_MATCHES_MESSAGE;
  }

  return {
    rows,
    trackOptions: getTrackOptions(input.recordings),
    total: input.recordings.length,
    activeFilterCount: countActiveFilters(input.filters),
    emptyMessage,
  };
};
