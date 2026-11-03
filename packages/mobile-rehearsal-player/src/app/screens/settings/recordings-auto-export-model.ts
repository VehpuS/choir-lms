import type { Recording } from '@org/audio-library-models';

import type { AutoExportFolderState } from '../../library/recording/export/auto-export-controller';
import type { AutoExportStatus } from '../../library/recording/export/auto-export-queue';
import type {
  AutoExportHold,
  AutoExportSettings,
} from '../../library/recording/export/auto-export-model';
import { exportFailureMessage } from '../../library/recording/export/recording-export-model';
import {
  DEFAULT_EXPORT_FOLDER_NAME,
  countRecordingsToBackUp,
} from '../../library/recording/export/auto-export-settings';

/**
 * What the Settings `Recordings` page shows for auto-export (rehearsal-recording
 * design Decision 19), worked out from the setting, the Drive session, the
 * queue's state and what this browser can report. The screen only draws it.
 */

export const AUTO_EXPORT_COPY = {
  switchTitle: 'Auto-export to Drive',
  switchOff: 'Off. Copy new recordings to Drive automatically.',
  switchOn: 'Uploads each new recording in the background.',
  allowTitle: 'Allow saving to Drive',
  allowBody:
    'The app can only read your Drive today. Saving lets it add the recordings you export to the folder below.',
  allowLabel: 'Allow saving',
  folderTitle: 'Folder',
  folderNote: 'Created in My Drive if missing.',
  changeFolderLabel: 'Change',
  uploadOverTitle: 'Upload over',
  uploadOverWifiLabel: 'Wi-Fi only',
  uploadOverAnyLabel: 'Any connection',
  uploadOverAnyNote: 'Uploads run whenever there is a connection.',
  uploadOverWifiNote: 'Uploads wait while the browser reports mobile data.',
  uploadOverUnknownNote:
    'This browser cannot tell Wi-Fi from mobile data, so uploads run on any connection. Browsers that can tell will wait for Wi-Fi.',
  exportTitle: 'Export',
  whatRecordingLabel: 'Recording only',
  whatMixLabel: 'Mix',
  whatBothLabel: 'Both',
  whatNote: 'A change applies to new recordings.',
  backUpTitle: 'Back up existing recordings',
  backUpLabel: 'Back up',
  backUpNone: 'Every recording made so far is on Drive or already included.',
} as const;

const HOLD_NOTES: Record<AutoExportHold, string | undefined> = {
  off: undefined,
  'no-folder': 'Choosing the folder.',
  'no-session': 'Waiting for permission to save to Drive.',
  offline: 'Waiting for a connection.',
  cellular: 'Waiting for Wi-Fi.',
};

export type AutoExportSettingsView = {
  enabled: boolean;
  switchDetail: string;
  /** Shown while the permission is missing. */
  allow?: { title: string; body: string; label: string };
  /** Present once auto-export is on. */
  folder?: { name: string; note: string; isError: boolean };
  uploadOverNote: string;
  /** What the queue is doing or waiting for, in words. */
  statusNote?: string;
  backUp: { detail: string; count: number };
};

export const buildAutoExportSettingsView = (input: {
  settings: AutoExportSettings;
  hasWriteAccess: boolean;
  status: AutoExportStatus;
  folderState: AutoExportFolderState;
  canTellConnectionType: boolean;
  recordings: readonly Recording[];
}): AutoExportSettingsView => {
  const { folderState, settings, status } = input;
  const count = countRecordingsToBackUp(input.recordings, settings);
  const uploadOverNote =
    settings.uploadOver === 'any'
      ? AUTO_EXPORT_COPY.uploadOverAnyNote
      : input.canTellConnectionType
        ? AUTO_EXPORT_COPY.uploadOverWifiNote
        : AUTO_EXPORT_COPY.uploadOverUnknownNote;
  const backUp = {
    count,
    detail:
      count === 0
        ? AUTO_EXPORT_COPY.backUpNone
        : `${count} ${count === 1 ? 'recording is' : 'recordings are'} not on Drive yet.`,
  };

  if (!settings.enabled) {
    return {
      backUp,
      enabled: false,
      switchDetail: AUTO_EXPORT_COPY.switchOff,
      uploadOverNote,
    };
  }

  const folderFailed = folderState.state === 'failed';
  const hold = status.gate.state === 'held' ? status.gate.reason : undefined;
  const statusNote = status.running
    ? `Uploading ${Math.round(status.running.progress * 100)}%`
    : hold
      ? HOLD_NOTES[hold]
      : undefined;

  return {
    allow: input.hasWriteAccess
      ? undefined
      : {
          body: AUTO_EXPORT_COPY.allowBody,
          label: AUTO_EXPORT_COPY.allowLabel,
          title: AUTO_EXPORT_COPY.allowTitle,
        },
    backUp,
    enabled: true,
    folder: {
      isError: folderFailed,
      name: settings.folder?.folderName ?? DEFAULT_EXPORT_FOLDER_NAME,
      note: folderFailed
        ? exportFailureMessage(folderState.reason)
        : AUTO_EXPORT_COPY.folderNote,
    },
    statusNote,
    switchDetail: AUTO_EXPORT_COPY.switchOn,
    uploadOverNote,
  };
};
