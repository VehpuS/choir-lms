import { useState } from 'react';

import type { DriveFolder } from '@org/google-drive';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import { getDriveSourceLocationIssueCopy } from './drive-source-location-issue-copy';
import { openDriveFileInGoogleDrive } from './open-drive-file-in-google-drive';
import { openSavedSourceOriginalFolderInGoogleDrive } from './open-saved-source-original-location';
import { showSavedSourceOriginalFolderInAdd } from './show-saved-source-in-add';

// `open-drive-file` is an Add row's "Open in Google Drive": the file's own
// page, reported on Add. The other two are the saved-track flows.
export type SourceLocationActionKind =
  | 'open-drive-file'
  | 'open-in-google-drive'
  | 'show-in-add';

export type SourceLocationIssue = {
  kind: SourceLocationActionKind;
  message: string;
  sourceId: string;
  title: string;
};

export type PendingSourceLocationAction = {
  kind: SourceLocationActionKind;
  sourceId: string;
};

const UNSUPPORTED_LINK_ISSUE = {
  message: 'This device cannot open Google Drive links.',
  title: 'Original Drive location unavailable',
};

const OPEN_FAILED_ISSUE = {
  message: 'Google Drive could not be opened. Try again.',
  title: 'Original Drive location unavailable',
};

const DRIVE_FILE_ISSUE_TITLE = 'Could not open Google Drive';
const DRIVE_FILE_ISSUE_MESSAGES = {
  'no-link': 'Google Drive did not return a link for this file.',
  'open-failed': OPEN_FAILED_ISSUE.message,
  'unsupported-link': UNSUPPORTED_LINK_ISSUE.message,
} as const;

/**
 * Drives the saved-track "Show in Add" and "Open in Google Drive" flows: a
 * live Drive lookup that must complete before either action's result is
 * final. Lives once at the shared rehearsal-library-controller level (not
 * per-screen) so both the Library and Add screens can observe and render the
 * same in-flight action and its outcome, each filtering by `kind` for the
 * one it's responsible for.
 */
export const useSavedSourceOriginalLocationActions = (options: {
  accessToken: string | undefined;
  canOpenUrl: (url: string) => Promise<boolean>;
  onOpenDriveFolder: (folder: DriveFolder) => void;
  onRequestAddDestination: () => void;
  onSaveSource: (source: DriveLibrarySource) => Promise<boolean>;
  openUrl: (url: string) => Promise<unknown>;
}) => {
  const [pendingSourceLocationAction, setPendingSourceLocationAction] =
    useState<PendingSourceLocationAction | null>(null);
  const [sourceLocationIssue, setSourceLocationIssue] =
    useState<SourceLocationIssue | null>(null);

  const withAccessToken = (
    source: DriveLibrarySource,
    kind: SourceLocationActionKind,
    run: (
      accessToken: string,
      reportIssue: (
        issue: Omit<SourceLocationIssue, 'kind' | 'sourceId'>,
      ) => void,
    ) => Promise<void>,
  ) => {
    const reportIssue = (
      issue: Omit<SourceLocationIssue, 'kind' | 'sourceId'>,
    ) => {
      setSourceLocationIssue({ kind, sourceId: source.id, ...issue });
    };
    const accessToken = options.accessToken;

    if (!accessToken) {
      reportIssue(getDriveSourceLocationIssueCopy('authorization-required'));
      return;
    }

    setSourceLocationIssue(null);
    setPendingSourceLocationAction({ kind, sourceId: source.id });
    void run(accessToken, reportIssue).finally(() => {
      setPendingSourceLocationAction(null);
    });
  };

  return {
    clearSourceLocationIssue: () => {
      setSourceLocationIssue(null);
    },
    openDriveSourceFileInGoogleDrive(source: DriveLibrarySource) {
      setSourceLocationIssue(null);
      void openDriveFileInGoogleDrive({
        canOpenUrl: options.canOpenUrl,
        openUrl: options.openUrl,
        url: source.webViewLink,
      }).then((result) => {
        if (result.status === 'opened') {
          return;
        }

        setSourceLocationIssue({
          kind: 'open-drive-file',
          message: DRIVE_FILE_ISSUE_MESSAGES[result.status],
          sourceId: source.id,
          title: DRIVE_FILE_ISSUE_TITLE,
        });
      });
    },
    openSourceInGoogleDrive(source: DriveLibrarySource) {
      withAccessToken(
        source,
        'open-in-google-drive',
        async (accessToken, reportIssue) => {
          const result = await openSavedSourceOriginalFolderInGoogleDrive({
            accessToken,
            canOpenUrl: options.canOpenUrl,
            openUrl: options.openUrl,
            saveSource: options.onSaveSource,
            source,
          });

          if (result.status === 'unresolved') {
            reportIssue(getDriveSourceLocationIssueCopy(result.reason));
            return;
          }

          if (result.status === 'unsupported-link') {
            reportIssue(UNSUPPORTED_LINK_ISSUE);
            return;
          }

          if (result.status === 'open-failed') {
            reportIssue(OPEN_FAILED_ISSUE);
          }
        },
      );
    },
    pendingSourceLocationAction,
    showSourceInAdd(source: DriveLibrarySource) {
      // Switches to Add immediately, before the live Drive lookup starts:
      // the destination screen renders its own loading state while it
      // waits, rather than the user waiting on Library in front of a
      // dismissed sheet (see design discussion on HIG action-sheet
      // dismissal + "jump to location" flows).
      options.onRequestAddDestination();
      withAccessToken(
        source,
        'show-in-add',
        async (accessToken, reportIssue) => {
          const result = await showSavedSourceOriginalFolderInAdd({
            accessToken,
            openFolder: options.onOpenDriveFolder,
            saveSource: options.onSaveSource,
            source,
          });

          if (result.status === 'unresolved') {
            reportIssue(getDriveSourceLocationIssueCopy(result.reason));
          }
        },
      );
    },
    sourceLocationIssue,
  };
};
