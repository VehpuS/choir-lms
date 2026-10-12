import { useState } from 'react';

import {
  LibraryFilesConfirmationDialog,
  type LibraryFilesConfirmationDialogContent,
} from './library-files-confirmation-dialog';

type PendingConfirmation = {
  content: LibraryFilesConfirmationDialogContent;
  onConfirm: () => Promise<void> | void;
};

export const useLibraryFilesConfirmationFlow = () => {
  const [isMutating, setIsMutating] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);

  const handleConfirm = () => {
    const confirmation = pendingConfirmation;

    if (!confirmation) {
      return;
    }

    setIsMutating(true);

    void (async () => {
      await confirmation.onConfirm();
      setIsMutating(false);
      setPendingConfirmation(null);
    })();
  };

  return {
    confirmationDialog: (
      <LibraryFilesConfirmationDialog
        content={pendingConfirmation?.content ?? null}
        isMutating={isMutating}
        onCancel={() => {
          if (!isMutating) {
            setPendingConfirmation(null);
          }
        }}
        onConfirm={handleConfirm}
      />
    ),
    isConfirming: isMutating,
    requestConfirmation: setPendingConfirmation,
  };
};
