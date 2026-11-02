import type {
  PlayableItem,
  Playlist,
  Recording,
} from '@org/audio-library-models';
import { useState, type ReactNode } from 'react';

import type { BulkAcknowledgment } from '../../selection/bulk-playback-run';
import { OptionsMenuSheet } from '../../components/options-menu-sheet';
import type { OptionsMenuAction } from '../../components/options-menu-sheet/model';
import { getRecordingsQueueAcknowledgment } from '../recordings-bulk-model';
import { getOfflineBatchRunner } from '../../offline/offline-batch';
import { runRecordingOfflineAction } from '../recording-offline';
import { resolveRecordingName } from '../recording-save-sheet-model';
import { getRecordingsStore } from '../recordings-store-instance';
import type { RecordingRow } from '../recordings-panel-model';
import { requestRecordingExport } from '../export/recording-export-request';
import { RecordingPlaylistPicker } from './recording-playlist-picker';
import {
  DeleteRecordingDialog,
  RenameRecordingDialog,
} from './recording-row-dialogs';

type OpenDialog = {
  kind: 'menu' | 'rename' | 'delete' | 'playlist';
  id: string;
} | null;

/** What `Add to playlist` needs; the menu offers it only when given. */
export type RecordingPlaylistServices = {
  playlists: Playlist[];
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  onAdded: (acknowledgment: BulkAcknowledgment) => void;
};

/** What `Play next` and `Add to queue` need; the menu offers them only when given. */
export type RecordingQueueServices = {
  /** False when nothing is playing, so there is no queue to add to. */
  canQueue: boolean;
  /** Resolves a recording to what would be queued, or why it cannot be. */
  resolve: (recording: Recording) => PlayableItem | null;
  queueNext: (items: PlayableItem[]) => unknown;
  queueUpNext: (items: PlayableItem[]) => unknown;
  onQueued: (acknowledgment: BulkAcknowledgment) => void;
};

type UseRecordingRowMenuOptions = {
  recordings: readonly Recording[] | null;
  rows: readonly RecordingRow[];
  refresh: () => Promise<void>;
  /** Plays a recording; returns a message when it cannot be played. */
  onPlay: (recording: Recording) => string | null;
  playlistServices?: RecordingPlaylistServices;
  queueServices?: RecordingQueueServices;
};

/**
 * The options menu, rename and delete dialogs of a recording row, shared by
 * the Recordings panel and the Library `Recordings` view so a row behaves the
 * same wherever it is listed.
 */
export const useRecordingRowMenu = ({
  onPlay,
  playlistServices,
  queueServices,
  recordings,
  refresh,
  rows,
}: UseRecordingRowMenuOptions) => {
  const [open, setOpen] = useState<OpenDialog>(null);
  const [playIssue, setPlayIssue] = useState<string | null>(null);
  const target = rows.find((row) => row.id === open?.id);
  const targetRecording = recordings?.find(({ id }) => id === open?.id);
  const close = () => setOpen(null);

  const play = (id: string) => {
    const recording = recordings?.find((candidate) => candidate.id === id);

    close();

    if (recording) {
      setPlayIssue(onPlay(recording));
    }
  };

  const queue = (id: string, action: 'play-next' | 'add-to-queue') => {
    const recording = recordings?.find((candidate) => candidate.id === id);
    const item = recording ? queueServices?.resolve(recording) : null;

    close();

    if (!queueServices || !item) {
      return;
    }

    (action === 'play-next'
      ? queueServices.queueNext
      : queueServices.queueUpNext)([item]);
    queueServices.onQueued(
      getRecordingsQueueAcknowledgment(action, {
        playable: [item],
        leftOutCount: 0,
      }),
    );
  };

  const rename = async (typed: string) => {
    if (target) {
      const name = resolveRecordingName(typed, target.name);

      if (name !== target.name) {
        await getRecordingsStore().update(target.id, { name });
        await refresh();
      }
    }

    close();
  };

  const remove = async () => {
    if (target) {
      await getRecordingsStore().delete(target.id);
      await refresh();
    }

    close();
  };

  const menuActions = (row: RecordingRow): OptionsMenuAction[] => [
    { id: 'play', label: 'Play', onPress: () => play(row.id) },
    ...(queueServices
      ? (['play-next', 'add-to-queue'] as const).map((action) => ({
          id: action,
          label: action === 'play-next' ? 'Play next' : 'Add to queue',
          disabled: !queueServices.canQueue,
          onPress: () => queue(row.id, action),
        }))
      : []),
    ...(playlistServices
      ? [
          {
            id: 'add-to-playlist',
            label: 'Add to playlist',
            onPress: () => setOpen({ kind: 'playlist', id: row.id }),
          },
        ]
      : []),
    {
      id: 'offline',
      label: row.offline.label,
      disabled: row.offline.disabled,
      onPress: () => {
        const runner = getOfflineBatchRunner();

        close();

        if (runner) {
          void runRecordingOfflineAction(row.offline, runner);
        }
      },
    },
    {
      id: 'export',
      label: 'Export…',
      onPress: () => {
        close();
        requestRecordingExport({ recordingIds: [row.id] });
      },
    },
    {
      id: 'rename',
      label: 'Rename',
      onPress: () => setOpen({ kind: 'rename', id: row.id }),
    },
    {
      id: 'delete',
      label: 'Delete',
      tone: 'destructive',
      onPress: () => setOpen({ kind: 'delete', id: row.id }),
    },
  ];

  const dialogs: ReactNode = (
    <>
      {target && open?.kind === 'menu' ? (
        <OptionsMenuSheet
          actions={menuActions(target)}
          isVisible
          onClose={close}
          title={target.name}
        />
      ) : null}
      {playlistServices && targetRecording && open?.kind === 'playlist' ? (
        <RecordingPlaylistPicker
          {...playlistServices}
          onClose={close}
          recordings={[targetRecording]}
        />
      ) : null}
      {target && open?.kind === 'rename' ? (
        <RenameRecordingDialog
          name={target.name}
          onCancel={close}
          onSave={(typed) => void rename(typed)}
        />
      ) : null}
      {target && open?.kind === 'delete' ? (
        <DeleteRecordingDialog
          name={target.name}
          onCancel={close}
          onDelete={() => void remove()}
        />
      ) : null}
    </>
  );

  return {
    dialogs,
    openMenu: (id: string) => setOpen({ kind: 'menu', id }),
    play,
    playIssue,
  };
};
