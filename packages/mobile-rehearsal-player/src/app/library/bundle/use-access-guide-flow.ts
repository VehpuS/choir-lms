import type { DriveAudioSource } from '@org/audio-library-models';
import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

import {
  applyAccessCheck,
  buildCopyList,
  buildOwnerMailto,
  groupNeedsAccessSources,
  isNeedsAccessSource,
  type AccessGuideGroup,
} from './access-guide-model';
import type { BundleServiceDependencies } from './bundle-service-types';
import { copyText, type CopyResult } from './copy-text';
import { useAbortableTask } from './use-abortable-task';

export type AccessGuideState =
  | { step: 'closed' }
  | {
      step: 'open';
      groups: AccessGuideGroup[];
      isChecking: boolean;
      /** The last `Check again`, so the guide can say what changed. */
      lastCheck: { recovered: number; stillNeeding: number } | null;
      copyResult: CopyResult | null;
    };

const toOpen = (
  sources: readonly DriveAudioSource[],
  lastCheck: { recovered: number; stillNeeding: number } | null,
): AccessGuideState => ({
  step: 'open',
  groups: groupNeedsAccessSources(sources),
  isChecking: false,
  lastCheck,
  copyResult: null,
});

/** The guide for files that need access: group, act, and check again. */
export const useAccessGuideFlow = ({
  deps,
  senderName,
}: {
  deps: BundleServiceDependencies | null;
  senderName?: string;
}) => {
  const [state, setState] = useState<AccessGuideState>({ step: 'closed' });
  const task = useAbortableTask();

  const open = useCallback(async () => {
    if (!deps) {
      return;
    }

    const input = await deps.library.load();

    setState(toOpen(input.sources, null));
  }, [deps]);

  const checkAgain = useCallback(async () => {
    if (!deps || state.step !== 'open') {
      return;
    }

    setState({ ...state, isChecking: true });

    const input = await deps.library.load();
    const needing = input.sources.filter(isNeedsAccessSource);
    const probe = await task.run((signal) =>
      deps.drive.probe(
        [...new Set(needing.map((source) => source.driveFileId))],
        signal,
      ),
    );

    if (probe.aborted) {
      setState({ ...state, isChecking: false });

      return;
    }

    const outcome = applyAccessCheck(needing, probe.access);

    if (outcome.updatedSources.length > 0) {
      await deps.library.repository.importLibraryEntities(
        deps.library.ownerId,
        {
          sources: outcome.updatedSources,
        },
      );
      await deps.library.onLibraryChanged();
    }

    const after = await deps.library.load();

    setState(
      toOpen(after.sources, {
        recovered: outcome.recoveredCount,
        stillNeeding: outcome.stillNeedingCount,
      }),
    );
  }, [deps, state, task]);

  const openUrl = useCallback((url: string) => {
    void Linking.openURL(url);
  }, []);

  const emailOwner = useCallback(
    (group: AccessGuideGroup) => {
      const mailto = buildOwnerMailto(group, senderName);

      if (mailto) {
        void Linking.openURL(mailto);
      }
    },
    [senderName],
  );

  const copyList = useCallback(async () => {
    if (state.step !== 'open') {
      return;
    }

    const copyResult = await copyText(buildCopyList(state.groups));

    setState((current) =>
      current.step === 'open' ? { ...current, copyResult } : current,
    );
  }, [state]);

  const close = useCallback(() => {
    task.cancel();
    setState({ step: 'closed' });
  }, [task]);

  return { state, open, close, checkAgain, openUrl, emailOwner, copyList };
};
