import { useState } from 'react';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { LibraryFilesIssue } from '../../saved-rehearsal-library/library-files-operation-helpers';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import { LibraryFilesRenameDialog } from './library-files-rename-dialog';
import {
  createLibraryFilesRenameSuccessFeedback,
  type LibraryFilesSuccessFeedback,
} from './library-files-success-feedback';

export const TRACKS_RENAME_DESCRIPTION =
  'Update the name of this track. Copies that still carry its name follow.';

// The Tracks view's `Rename`: renames the track entry. Copies in Files that
// still use the track's name follow it; a copy the user named on purpose keeps
// its own name, so no prompt is needed here.
export const useTracksRename = (options: {
  files: UseLibraryFilesResult;
  onShowSuccessFeedback?: (feedback: LibraryFilesSuccessFeedback) => void;
}) => {
  const { files, onShowSuccessFeedback } = options;
  const [pendingSource, setPendingSource] = useState<DriveLibrarySource | null>(
    null,
  );
  const [draftName, setDraftName] = useState('');
  const [issue, setIssue] = useState<LibraryFilesIssue | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const close = () => {
    setPendingSource(null);
    setDraftName('');
    setIssue(null);
    files.clearIssue();
  };

  const submit = (suggestedName?: string) => {
    if (!pendingSource) {
      return;
    }

    const name = (suggestedName ?? draftName).trim();

    setIssue(null);
    setIsMutating(true);

    void (async () => {
      const result = await files.renameTrack({
        copies: 'matching',
        name,
        sourceId: pendingSource.id,
      });

      setIsMutating(false);

      if (!result.didComplete) {
        setIssue(result.issue);
        files.clearIssue();
        return;
      }

      onShowSuccessFeedback?.(
        createLibraryFilesRenameSuccessFeedback({
          nextName: name,
          previousName: pendingSource.name,
        }),
      );
      close();
    })();
  };

  return {
    onRenameSource(source: DriveLibrarySource) {
      setIssue(null);
      setDraftName(source.name);
      setPendingSource(source);
    },
    renameDialog: (
      <LibraryFilesRenameDialog
        description={TRACKS_RENAME_DESCRIPTION}
        isMutating={isMutating}
        isVisible={pendingSource !== null}
        issue={issue}
        onCancel={close}
        onChange={(value) => {
          setIssue(null);
          setDraftName(value);
        }}
        onRecoverSuggestedName={submit}
        onSubmit={() => {
          submit();
        }}
        value={draftName}
      />
    ),
  };
};
