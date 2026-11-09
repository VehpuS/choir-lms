import type { DriveBundleListing } from '@org/google-drive';

import type { FolderChoice } from './folder-choices';
import type { ImportPreview } from './import-bundle';
import type { ReadBundleResult } from './read-bundle';
import type { BundlePhase } from './bundle-service-types';

export type FlowMode = 'restore' | 'import';
export type ReadOk = Extract<ReadBundleResult, { status: 'ok' }>;

export type RestoreImportState =
  | { step: 'closed' }
  | { step: 'loading'; mode: FlowMode }
  | { step: 'list'; mode: FlowMode; bundles: DriveBundleListing[] }
  /** Restore only: the user picks Add or Replace; neither is preselected. */
  | { step: 'choose'; read: ReadOk; choice: 'add' | 'replace' | null }
  | { step: 'reading'; mode: FlowMode }
  | {
      step: 'preview';
      mode: FlowMode;
      read: ReadOk;
      preview: ImportPreview;
      restoreRecordings: boolean;
    }
  | {
      step: 'destination';
      read: ReadOk;
      preview: ImportPreview;
      folders: FolderChoice[];
      destinationId: string;
      restoreRecordings: boolean;
    }
  | {
      step: 'confirm-replace';
      read: ReadOk;
      uploadBytes: number;
      restoreRecordings: boolean;
    }
  | { step: 'permission'; read: ReadOk; restoreRecordings: boolean }
  | { step: 'running'; kind: 'import' | 'replace'; phase: BundlePhase | null }
  | {
      step: 'import-done';
      needsAccessCount: number;
      folderName: string;
      failedMessage: string | null;
      wasCancelled: boolean;
      recordingsLine: string | null;
    }
  | {
      step: 'replace-done';
      safetyBackupName: string;
      recordingsLine: string | null;
    }
  | { step: 'refused'; message: string }
  | { step: 'failed'; message: string; librarySafe: boolean };
