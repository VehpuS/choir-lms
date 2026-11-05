import {
  getMissingExportKinds,
  type AutoExportWhat,
  type Recording,
} from '@org/audio-library-models';

import type { AutoExportSettings, UploadOver } from './auto-export-model';

/**
 * The auto-export setting as a value and the rules for changing it
 * (rehearsal-recording design Decision 19). `eligibleFrom` is what keeps the
 * past from being uploaded by accident: turning the setting on, or changing the
 * folder or what is exported, applies to recordings made from then on, and only
 * `Back up existing recordings` reaches back.
 */

export const DEFAULT_EXPORT_FOLDER_NAME = 'Choir Recordings';

export const DEFAULT_AUTO_EXPORT_SETTINGS: AutoExportSettings = {
  eligibleFrom: null,
  enabled: false,
  // The recording is the work that cannot be made again; a mix can be rebuilt.
  what: 'recording',
  uploadOver: 'wifi',
};

export type AutoExportChange =
  | { type: 'enable' }
  | { type: 'disable' }
  | { type: 'set-what'; what: AutoExportWhat }
  | { type: 'set-folder'; folder: { folderId: string; folderName: string } }
  | { type: 'set-upload-over'; uploadOver: UploadOver }
  | { type: 'back-up-existing' };

export const applyAutoExportChange = (
  current: AutoExportSettings,
  change: AutoExportChange,
  now: Date,
): AutoExportSettings => {
  const fromNow = now.toISOString();

  switch (change.type) {
    case 'enable':
      return current.enabled
        ? current
        : { ...current, eligibleFrom: fromNow, enabled: true };
    case 'disable':
      return { ...current, enabled: false };
    case 'set-what':
      return change.what === current.what
        ? current
        : { ...current, eligibleFrom: fromNow, what: change.what };
    case 'set-folder':
      return current.folder?.folderId === change.folder.folderId
        ? current
        : { ...current, eligibleFrom: fromNow, folder: change.folder };
    case 'set-upload-over':
      return { ...current, uploadOver: change.uploadOver };
    case 'back-up-existing':
      return { ...current, eligibleFrom: null };
  }
};

const WHAT_VALUES: readonly AutoExportWhat[] = ['recording', 'mix', 'both'];
const UPLOAD_OVER_VALUES: readonly UploadOver[] = ['wifi', 'any'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Reads a stored value; anything unreadable or out of range falls back to the default for that field. */
export const parseAutoExportSettings = (value: unknown): AutoExportSettings => {
  const defaults = DEFAULT_AUTO_EXPORT_SETTINGS;

  if (!isRecord(value)) {
    return defaults;
  }

  const folder = isRecord(value.folder) ? value.folder : undefined;

  return {
    eligibleFrom:
      typeof value.eligibleFrom === 'string' ? value.eligibleFrom : null,
    enabled: value.enabled === true,
    ...(typeof folder?.folderId === 'string' &&
    typeof folder.folderName === 'string'
      ? { folder: { folderId: folder.folderId, folderName: folder.folderName } }
      : {}),
    uploadOver: UPLOAD_OVER_VALUES.includes(value.uploadOver as UploadOver)
      ? (value.uploadOver as UploadOver)
      : defaults.uploadOver,
    what: WHAT_VALUES.includes(value.what as AutoExportWhat)
      ? (value.what as AutoExportWhat)
      : defaults.what,
  };
};

/**
 * Recordings the setting would export but leaves alone because they were made
 * before it: what `Back up existing recordings` would add.
 */
export const listRecordingsToBackUp = (
  recordings: readonly Recording[],
  settings: AutoExportSettings,
): Recording[] =>
  settings.eligibleFrom === null
    ? []
    : recordings.filter(
        (recording) =>
          recording.createdAt < (settings.eligibleFrom ?? '') &&
          getMissingExportKinds(recording, settings.what).length > 0,
      );

export const countRecordingsToBackUp = (
  recordings: readonly Recording[],
  settings: AutoExportSettings,
): number => listRecordingsToBackUp(recordings, settings).length;
