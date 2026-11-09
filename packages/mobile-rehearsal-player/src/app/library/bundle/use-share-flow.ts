import { useCallback, useEffect, useState } from 'react';

import type {
  BundlePhase,
  BundleServiceDependencies,
} from './bundle-service-types';
import { previewShare, shareFolder, type SharePreview } from './share-folder';
import { useAbortableTask } from './use-abortable-task';
import type { Recording } from '@org/audio-library-models';

export type ShareState =
  | { step: 'closed' }
  | { step: 'permission'; folderId: string; folderName: string }
  | {
      step: 'preview';
      folderId: string;
      folderName: string;
      preview: SharePreview;
      recordings: Recording[];
      includeOutside: boolean;
      selected: ReadonlySet<string>;
    }
  | { step: 'saving'; phase: BundlePhase | null }
  | { step: 'done'; fileName: string; openUrl: string }
  | { step: 'failed'; message: string };

type ShareFlowOptions = {
  deps: BundleServiceDependencies | null;
  hasWriteAccess: boolean;
  requestWriteAccess: () => void;
};

/** The Share flow for one library folder: preview, choices, save, then where to share it. */
export const useShareFlow = ({
  deps,
  hasWriteAccess,
  requestWriteAccess,
}: ShareFlowOptions) => {
  const [state, setState] = useState<ShareState>({ step: 'closed' });
  const task = useAbortableTask();

  const toPreview = useCallback(
    async (folderId: string, folderName: string) => {
      if (!deps) {
        return;
      }

      const [preview, recordings] = await Promise.all([
        previewShare(deps, folderId),
        deps.library.recordings(),
      ]);

      setState({
        step: 'preview',
        folderId,
        folderName,
        preview,
        recordings: [...recordings],
        includeOutside: false,
        selected: new Set(),
      });
    },
    [deps],
  );

  const open = useCallback(
    (folderId: string, folderName: string) => {
      if (!deps || !hasWriteAccess) {
        setState({ step: 'permission', folderId, folderName });

        return;
      }

      void toPreview(folderId, folderName);
    },
    [deps, hasWriteAccess, toPreview],
  );

  useEffect(() => {
    if (state.step === 'permission' && deps && hasWriteAccess) {
      void toPreview(state.folderId, state.folderName);
    }
  }, [deps, hasWriteAccess, state, toPreview]);

  const setIncludeOutside = useCallback((includeOutside: boolean) => {
    setState((current) =>
      current.step === 'preview' ? { ...current, includeOutside } : current,
    );
  }, []);

  const toggleRecording = useCallback((id: string) => {
    setState((current) => {
      if (current.step !== 'preview') {
        return current;
      }

      const selected = new Set(current.selected);

      if (!selected.delete(id)) {
        selected.add(id);
      }

      return { ...current, selected };
    });
  }, []);

  const start = useCallback(async () => {
    if (state.step !== 'preview' || !deps) {
      return;
    }

    const { folderId, folderName, includeOutside, selected } = state;

    setState({ step: 'saving', phase: null });

    const result = await task.run((signal) =>
      shareFolder(deps, {
        folderId,
        folderName,
        includeOutsideReferences: includeOutside,
        selectedRecordingIds: selected,
        signal,
        onProgress: (phase) =>
          setState((current) =>
            current.step === 'saving' ? { ...current, phase } : current,
          ),
      }),
    );

    if (result.status === 'cancelled') {
      setState({ step: 'closed' });
    } else if (result.status === 'failed') {
      setState({ step: 'failed', message: result.message });
    } else {
      setState({
        step: 'done',
        fileName: result.fileName,
        openUrl: result.openUrl,
      });
    }
  }, [deps, state, task]);

  const close = useCallback(() => {
    task.cancel();
    setState({ step: 'closed' });
  }, [task]);

  return {
    state,
    open,
    close,
    start,
    setIncludeOutside,
    toggleRecording,
    allowSaving: requestWriteAccess,
    cancel: task.cancel,
  };
};
