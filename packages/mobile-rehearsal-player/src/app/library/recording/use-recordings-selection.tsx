import type {
  DriveAudioSource,
  NamedLoop,
  Recording,
} from '@org/audio-library-models';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { ExplorerRowSelection } from '../components/explorer/model';
import { getOfflineBatchRunner } from '../offline/offline-batch';
import type { OfflineState } from '../offline/offline-state-store';
import type { BulkAction } from '../selection/bulk-action-model';
import { useLibrarySelectionServices } from '../selection/library-selection-services';
import { getSelectionCountLabel } from '../selection/selection-copy';
import { SelectEntryButton } from '../selection/select-entry-button';
import { SelectionBar } from '../selection/selection-bar';
import { usePinnedBulkActionBar } from '../selection/use-pinned-bulk-action-bar';
import { useSelection } from '../selection/use-selection';
import { requestRecordingExport } from './export/recording-export-request';
import { RecordingPlaylistPicker } from './components/recording-playlist-picker';
import { DeleteRecordingsDialog } from './components/recording-row-dialogs';
import { runRecordingOfflineAction } from './recording-offline';
import {
  getDeleteRecordingsTitle,
  getRecordingsBulkModel,
  getRecordingsDeletedAcknowledgment,
  getRecordingsQueueAcknowledgment,
  type RecordingsBulkActionId,
} from './recordings-bulk-model';
import { getRecordingsStore } from './recordings-store-instance';

type UseRecordingsSelectionOptions = {
  /** The recordings on screen in display order; `Select all` covers exactly these. */
  recordings: readonly Recording[];
  library: {
    sources: readonly DriveAudioSource[];
    loops: readonly NamedLoop[];
  };
  /** Saved tracks, the owners the offline action reads. */
  tracks: readonly DriveAudioSource[];
  stateOf: (driveFileId: string) => OfflineState;
  refresh: () => Promise<void>;
};

export type RecordingsSelectionControls = {
  entryButton: ReactNode;
  selectionBar: ReactNode;
  dialogs: ReactNode;
  getRowSelection: (id: string) => ExplorerRowSelection;
  isActive: boolean;
};

/**
 * Selection mode for the Library `Recordings` view (rehearsal-recording task
 * 8.3): the shared entry icon, selection bar and pinned bulk-action bar over
 * recordings keyed by id, with the actions from `getRecordingsBulkModel`.
 */
export const useRecordingsSelection = ({
  library,
  recordings,
  refresh,
  stateOf,
  tracks,
}: UseRecordingsSelectionOptions): RecordingsSelectionControls => {
  const services = useLibrarySelectionServices();
  const selection = useSelection<Recording>();
  const { cancel, deselectMany, enter, prune, selectMany, toggle } = selection;
  const [isDeleteVisible, setIsDeleteVisible] = useState(false);
  const [isPlaylistVisible, setIsPlaylistVisible] = useState(false);
  const ids = useMemo(() => recordings.map(({ id }) => id), [recordings]);

  // Selection ends when the tab is left, and drops recordings that no longer exist.
  useEffect(() => {
    if (!services.isDestinationActive) {
      cancel();
    }
  }, [cancel, services.isDestinationActive]);
  useEffect(() => {
    prune(new Set(ids));
  }, [ids, prune]);

  const selected = useMemo(
    () => recordings.filter(({ id }) => selection.selectedKeys.has(id)),
    [recordings, selection.selectedKeys],
  );
  const model = useMemo(
    () =>
      getRecordingsBulkModel({
        selected,
        canQueue: services.canQueue,
        library,
        offline: { sources: tracks, stateOf },
      }),
    [library, selected, services.canQueue, stateOf, tracks],
  );

  const run = useCallback(
    (id: RecordingsBulkActionId) => {
      if (id === 'add-to-playlist') {
        setIsPlaylistVisible(true);

        return;
      }

      if (id === 'export') {
        requestRecordingExport({
          recordingIds: selected.map((recording) => recording.id),
        });
        cancel();

        return;
      }

      if (id === 'delete') {
        setIsDeleteVisible(true);

        return;
      }

      if (id === 'offline') {
        const runner = getOfflineBatchRunner();

        if (runner) {
          void runRecordingOfflineAction(model.offline, runner);
        }

        cancel();

        return;
      }

      (id === 'play-next'
        ? services.queueItemsNext
        : services.queueItemsUpNext)(model.playable);
      services.acknowledge(getRecordingsQueueAcknowledgment(id, model));
      cancel();
    },
    [cancel, model, services],
  );
  const actions = useMemo<BulkAction[]>(
    () =>
      model.actions.map((action) => ({
        id: action.id,
        label: action.label,
        isDisabled: action.isDisabled,
        disabledReason: action.disabledReason,
        tone: action.tone,
        onPress: () => run(action.id),
      })),
    [model.actions, run],
  );
  const overflowTitle = getSelectionCountLabel(selection.selectedCount);

  usePinnedBulkActionBar(
    useMemo(
      () =>
        selection.isActive && services.isDestinationActive
          ? { actions, overflowTitle }
          : null,
      [
        actions,
        overflowTitle,
        selection.isActive,
        services.isDestinationActive,
      ],
    ),
  );

  const isAllSelected =
    ids.length > 0 && ids.every((id) => selection.selectedKeys.has(id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      deselectMany(ids);

      return;
    }

    selectMany(
      recordings
        .filter(({ id }) => !selection.selectedKeys.has(id))
        .map((item) => ({ item, key: item.id })),
    );
  };

  const deleteSelected = async () => {
    const count = selected.length;

    for (const recording of selected) {
      await getRecordingsStore().delete(recording.id);
    }

    setIsDeleteVisible(false);
    cancel();
    services.acknowledge(getRecordingsDeletedAcknowledgment(count));
    await refresh();
  };

  return {
    dialogs: isPlaylistVisible ? (
      <RecordingPlaylistPicker
        createPlaylist={services.createPlaylist}
        onAdded={(acknowledgment) => {
          services.acknowledge(acknowledgment);
          cancel();
        }}
        onClose={() => setIsPlaylistVisible(false)}
        playlists={services.collections.playlists}
        recordings={selected}
        updatePlaylist={services.updatePlaylist}
      />
    ) : isDeleteVisible ? (
      <DeleteRecordingsDialog
        onCancel={() => setIsDeleteVisible(false)}
        onDelete={() => void deleteSelected()}
        title={getDeleteRecordingsTitle(selected.length)}
      />
    ) : null,
    entryButton:
      !selection.isActive && recordings.length > 0 ? (
        <SelectEntryButton onPress={() => enter()} />
      ) : null,
    getRowSelection: (id) => {
      const recording = recordings.find((candidate) => candidate.id === id);
      const entry = recording ? { item: recording, key: id } : null;

      return {
        isActive: selection.isActive,
        isSelected: selection.selectedKeys.has(id),
        onEnter: () => entry && enter(entry),
        onToggle: () => entry && toggle(entry),
      };
    },
    isActive: selection.isActive,
    selectionBar: selection.isActive ? (
      <SelectionBar
        onCancel={cancel}
        selectAll={{
          isAllSelected,
          isDisabled: ids.length === 0,
          onToggle: toggleSelectAll,
        }}
        selectedCount={selection.selectedCount}
      />
    ) : null,
  };
};
