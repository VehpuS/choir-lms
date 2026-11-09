import type {
  CompositeTrack,
  DriveAudioSource,
} from '@org/audio-library-models';

import type { OptionsMenuAction } from '../../components/options-menu-sheet/model';
import { getOfflineBatchRunner } from '../../offline/offline-batch';
import { isOfflineStorageSupported } from '../../offline/offline-actions';
import { offlineStateStore } from '../../offline/offline-state';
import type { BulkAcknowledgment } from '../../selection/bulk-playback-run';
import {
  resolveCompositeOfflineActions,
  resolveCompositeOfflineSources,
  resolveCompositeOfflineState,
  runCompositeOffline,
} from './composite-offline';

/**
 * The `Keep all stems offline` rows of a composite's menu, shared by the
 * Composites view and the Files row menu. Empty where offline storage is not
 * supported.
 */
export const resolveCompositeOfflineMenuActions = (options: {
  acknowledge: (acknowledgment: BulkAcknowledgment) => void;
  composite: Pick<CompositeTrack, 'stems'>;
  sources: readonly DriveAudioSource[];
}): OptionsMenuAction[] => {
  if (!isOfflineStorageSupported) {
    return [];
  }

  const files = resolveCompositeOfflineSources(
    options.composite,
    options.sources,
  );
  const run = (kind: 'keep' | 'remove') => {
    void runCompositeOffline({
      kind,
      runner: getOfflineBatchRunner(),
      sources: files,
    }).then(options.acknowledge);
  };

  return resolveCompositeOfflineActions({
    ...resolveCompositeOfflineState(files, (id) =>
      offlineStateStore.getState(id),
    ),
    onKeep: () => run('keep'),
    onRemove: () => run('remove'),
  });
};
