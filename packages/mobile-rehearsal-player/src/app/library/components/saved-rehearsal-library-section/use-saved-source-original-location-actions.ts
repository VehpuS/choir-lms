import { useState } from 'react';

import type { DriveFolder } from '@org/google-drive';

import type { DriveSessionMenuController } from '../../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { getDriveSourceLocationIssueCopy } from '../../saved-rehearsal-library/drive-source-location-issue-copy';
import { openSavedSourceOriginalFolderInGoogleDrive } from '../../saved-rehearsal-library/open-saved-source-original-location';
import { showSavedSourceOriginalFolderInAdd } from '../../saved-rehearsal-library/show-saved-source-in-add';

export type SourceLocationIssue = {
  message: string;
  sourceId: string;
  title: string;
};

const UNSUPPORTED_LINK_ISSUE = {
  message: 'This device cannot open Google Drive links.',
  title: 'Original Drive location unavailable',
};

const OPEN_FAILED_ISSUE = {
  message: 'Google Drive could not be opened. Try again.',
  title: 'Original Drive location unavailable',
};

/**
 * Drives the saved-track "Show in Add" and "Open in Google Drive" flows: a
 * live Drive lookup that must complete before either action fires, kept out
 * of the already large row-action-flows hook.
 */
export const useSavedSourceOriginalLocationActions = (options: {
  authorization?: DriveSessionMenuController;
  canOpenUrl: (url: string) => Promise<boolean>;
  onOpenDriveFolder: (folder: DriveFolder) => void;
  onRequestAddDestination: () => void;
  onSaveSource: (source: DriveLibrarySource) => Promise<boolean>;
  openUrl: (url: string) => Promise<unknown>;
}) => {
  const [pendingSourceLocationSourceId, setPendingSourceLocationSourceId] =
    useState<string | null>(null);
  const [sourceLocationIssue, setSourceLocationIssue] =
    useState<SourceLocationIssue | null>(null);

  const withAccessToken = (
    source: DriveLibrarySource,
    run: (accessToken: string) => Promise<void>,
  ) => {
    const accessToken = options.authorization?.authState.accessToken;

    if (!accessToken) {
      setSourceLocationIssue({
        sourceId: source.id,
        ...getDriveSourceLocationIssueCopy('authorization-required'),
      });
      return;
    }

    setSourceLocationIssue(null);
    setPendingSourceLocationSourceId(source.id);
    void run(accessToken).finally(() => {
      setPendingSourceLocationSourceId(null);
    });
  };

  return {
    clearSourceLocationIssue: () => {
      setSourceLocationIssue(null);
    },
    openSourceInGoogleDrive(source: DriveLibrarySource) {
      withAccessToken(source, async (accessToken) => {
        const result = await openSavedSourceOriginalFolderInGoogleDrive({
          accessToken,
          canOpenUrl: options.canOpenUrl,
          openUrl: options.openUrl,
          saveSource: options.onSaveSource,
          source,
        });

        if (result.status === 'unresolved') {
          setSourceLocationIssue({
            sourceId: source.id,
            ...getDriveSourceLocationIssueCopy(result.reason),
          });
          return;
        }

        if (result.status === 'unsupported-link') {
          setSourceLocationIssue({
            sourceId: source.id,
            ...UNSUPPORTED_LINK_ISSUE,
          });
          return;
        }

        if (result.status === 'open-failed') {
          setSourceLocationIssue({ sourceId: source.id, ...OPEN_FAILED_ISSUE });
        }
      });
    },
    pendingSourceLocationSourceId,
    showSourceInAdd(source: DriveLibrarySource) {
      withAccessToken(source, async (accessToken) => {
        const result = await showSavedSourceOriginalFolderInAdd({
          accessToken,
          goToAdd: options.onRequestAddDestination,
          openFolder: options.onOpenDriveFolder,
          saveSource: options.onSaveSource,
          source,
        });

        if (result.status === 'unresolved') {
          setSourceLocationIssue({
            sourceId: source.id,
            ...getDriveSourceLocationIssueCopy(result.reason),
          });
        }
      });
    },
    sourceLocationIssue,
  };
};
