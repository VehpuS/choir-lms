import { useCallback, useState, type ReactNode } from 'react';

import {
  getForgetSessionPrompt,
  type ForgetSessionPrompt,
} from '../../../../library/offline/forget-session-prompt';
import { offlineStorageService } from '../../../../library/offline/offline-storage-instance';
import { ForgetSessionDialog } from './forget-session-dialog';

/**
 * Wraps forgetting the Drive session: with offline files stored it asks
 * whether to keep or clear them first (task 1.10), otherwise it forgets at
 * once. Returns the request to call in place of `onForget`, and the dialog.
 */
export const useForgetSessionPrompt = (
  onForget: () => void,
): { dialog: ReactNode; requestForget: () => void } => {
  const [prompt, setPrompt] = useState<ForgetSessionPrompt | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const requestForget = useCallback(() => {
    void (async () => {
      // A storage read that fails is the same as nothing stored: signing out
      // must never be blocked by the cache.
      const entries = await offlineStorageService.list().catch(() => []);
      const next = getForgetSessionPrompt(entries);

      if (next === null) {
        onForget();

        return;
      }

      setPrompt(next);
    })();
  }, [onForget]);

  const close = () => {
    setPrompt(null);
  };

  return {
    dialog: prompt ? (
      <ForgetSessionDialog
        isBusy={isClearing}
        onCancel={close}
        onClear={() => {
          setIsClearing(true);
          void offlineStorageService.clearAll().finally(() => {
            setIsClearing(false);
            close();
            onForget();
          });
        }}
        onKeep={() => {
          close();
          onForget();
        }}
        prompt={prompt}
      />
    ) : null,
    requestForget,
  };
};
