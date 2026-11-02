import type { Recording } from '@org/audio-library-models';
import { useState, type ReactNode } from 'react';

import { OptionsMenuSheet } from '../../components/options-menu-sheet';
import type { OptionsMenuAction } from '../../components/options-menu-sheet/model';
import { getOfflineBatchRunner } from '../../offline/offline-batch';
import { runRecordingOfflineAction } from '../recording-offline';
import { resolveRecordingName } from '../recording-save-sheet-model';
import { getRecordingsStore } from '../recordings-store-instance';
import type { RecordingRow } from '../recordings-panel-model';
import {
  DeleteRecordingDialog,
  RenameRecordingDialog,
} from './recording-row-dialogs';

type OpenDialog = { kind: 'menu' | 'rename' | 'delete'; id: string } | null;

type UseRecordingRowMenuOptions = {
  recordings: readonly Recording[] | null;
  rows: readonly RecordingRow[];
  refresh: () => Promise<void>;
  /** Plays a recording; returns a message when it cannot be played. */
  onPlay: (recording: Recording) => string | null;
};

/**
 * The options menu, rename and delete dialogs of a recording row, shared by
 * the Recordings panel and the Library `Recordings` view so a row behaves the
 * same wherever it is listed.
 */
export const useRecordingRowMenu = ({
  onPlay,
  recordings,
  refresh,
  rows,
}: UseRecordingRowMenuOptions) => {
  const [open, setOpen] = useState<OpenDialog>(null);
  const [playIssue, setPlayIssue] = useState<string | null>(null);
  const target = rows.find((row) => row.id === open?.id);
  const close = () => setOpen(null);

  const play = (id: string) => {
    const recording = recordings?.find((candidate) => candidate.id === id);

    close();

    if (recording) {
      setPlayIssue(onPlay(recording));
    }
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
