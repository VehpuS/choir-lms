import { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import { useEffect, useState } from 'react';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../storage/local-library-storage';
import { resolveSaveInOptions, type SaveInOptions } from './save-in-model';

/**
 * The folders the create sheet can save in, read from the Files tree while the
 * sheet is open. Null until read, or when storage cannot be read: the sheet
 * then leaves `Save in` out and the composite takes the default folder.
 */
export const useSaveInOptions = (
  trackIds: readonly string[] | null,
): SaveInOptions | null => {
  const [options, setOptions] = useState<SaveInOptions | null>(null);
  const key = trackIds?.join('|') ?? null;

  useEffect(() => {
    if (key === null) {
      setOptions(null);

      return undefined;
    }

    let isCurrent = true;

    void new AsyncStoragePracticeRepository()
      .listLibraryFileTree(LOCAL_REHEARSAL_LIBRARY_OWNER_ID)
      .then((tree) => {
        if (isCurrent) {
          setOptions(resolveSaveInOptions(tree, key.split('|')));
        }
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [key]);

  return options;
};
