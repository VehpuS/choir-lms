import type {
  CompositeTrack,
  DriveAudioSource,
} from '@org/audio-library-models';
import { uniqBy } from 'es-toolkit';

import type { OptionsMenuAction } from '../../components/options-menu-sheet/model';
import { getKeepResultAcknowledgment } from '../../selection/use-bulk-offline-actions';
import type { BulkAcknowledgment } from '../../selection/bulk-playback-run';
import type { OfflineBatchRunner } from '../../offline/offline-batch';
import {
  resolveOfflineMenuActions,
  type OfflineMenuState,
} from '../../offline/offline-menu-action';
import type { OfflineState } from '../../offline/offline-state-store';

/**
 * `Keep offline` for a composite (composite-tracks 7.3): it keeps the file of
 * every stem's track through the same keeping the track actions use, and the
 * composite counts as kept when every stem is. Prepared stems are a cache and
 * are not part of this (they are listed and cleared in the offline files view).
 */

export const KEEP_STEMS_OFFLINE_LABEL = 'Keep all stems offline';
export const REMOVE_STEMS_OFFLINE_LABEL = 'Remove all stems from offline';
export const COMPOSITE_RECONNECT_MESSAGE =
  'Reconnect Google Drive and try again.';
const REMOVED_TITLE = 'Removed from offline';
const KEEP_FAILED_TITLE = 'Could not keep offline';

/** The files the composite's stems play, once each, skipping missing tracks. */
export const resolveCompositeOfflineSources = (
  composite: Pick<CompositeTrack, 'stems'>,
  sources: readonly DriveAudioSource[],
): DriveAudioSource[] => {
  const found = composite.stems.flatMap((stem) => {
    const source = sources.find(({ id }) => id === stem.trackId);

    return source ? [source] : [];
  });

  return uniqBy(found, (source) => source.driveFileId);
};

/** The aggregate state shown on the composite's menu. */
export const resolveCompositeOfflineState = (
  files: readonly Pick<DriveAudioSource, 'driveFileId' | 'modifiedTime'>[],
  getState: (driveFileId: string) => OfflineState,
): { canKeep: boolean; state: OfflineState } => {
  const states = files.map(({ driveFileId }) => getState(driveFileId));
  const state: OfflineState = states.includes('downloading')
    ? 'downloading'
    : states.length > 0 && states.every((value) => value === 'kept')
      ? 'kept'
      : 'none';

  return {
    // A file with no Drive version cannot be cached, so it blocks the keep.
    canKeep:
      files.length > 0 &&
      files.every(({ modifiedTime }) => modifiedTime !== undefined),
    state,
  };
};

/** The menu rows: the track wording, made to say it covers every stem. */
export const resolveCompositeOfflineActions = (
  offline: OfflineMenuState | undefined,
): OptionsMenuAction[] => {
  return resolveOfflineMenuActions(offline, 'composite').map((action) => {
    if (action.id.endsWith(':remove-offline')) {
      return { ...action, label: REMOVE_STEMS_OFFLINE_LABEL };
    }

    return action.disabled && offline?.state === 'downloading'
      ? action
      : { ...action, label: KEEP_STEMS_OFFLINE_LABEL };
  });
};

/** Runs a keep or a remove over the stems' files and says what happened. */
export const runCompositeOffline = async (options: {
  kind: 'keep' | 'remove';
  runner: OfflineBatchRunner | null;
  sources: readonly DriveAudioSource[];
}): Promise<BulkAcknowledgment> => {
  const { kind, runner, sources } = options;

  if (!runner) {
    return { message: COMPOSITE_RECONNECT_MESSAGE, title: KEEP_FAILED_TITLE };
  }

  try {
    if (kind === 'remove') {
      await runner.removeSources(sources);

      return {
        message: `All ${sources.length} stems removed from offline.`,
        title: REMOVED_TITLE,
      };
    }

    return getKeepResultAcknowledgment(await runner.keepSources(sources));
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Try again.',
      title: KEEP_FAILED_TITLE,
    };
  }
};
