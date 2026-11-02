import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import { OptionsMenuSheet } from '../../components/options-menu-sheet';
import type { OptionsMenuAction } from '../../components/options-menu-sheet/model';
import { useOfflineRevision } from '../../offline/offline-state';
import { offlineStateStore } from '../../offline/offline-state';
import { getOfflineBatchRunner } from '../../offline/offline-batch';
import type { DriveAudioSource, Recording } from '@org/audio-library-models';
import { runRecordingOfflineAction } from '../recording-offline';
import {
  getRecordingsPanelModel,
  type RecordingRow as RecordingRowModel,
  type RecordingsView,
} from '../recordings-panel-model';
import { resolveRecordingName } from '../recording-save-sheet-model';
import { getRecordingsStore } from '../recordings-store-instance';
import { useRecordingsList } from '../use-recordings-list';
import {
  DeleteRecordingDialog,
  RenameRecordingDialog,
} from './recording-row-dialogs';
import { RecordingRow } from './recording-row';

const { colors, space, type } = appTheme;

type RecordingsPanelProps = {
  view: RecordingsView;
  viewName: string;
  /** Saved tracks, the owners the offline actions and `Original changed` read. */
  sources: readonly DriveAudioSource[];
  library: {
    sources: readonly { id: string }[];
    loops: readonly { id: string }[];
  };
  onClose: () => void;
  /**
   * Plays a recording in its recorded context. Returns a message when it
   * cannot be played, which the panel shows; the host closes the panel on success.
   */
  onPlay: (recording: Recording) => string | null;
};

type OpenDialog = { kind: 'menu' | 'rename' | 'delete'; id: string } | null;

const Section = ({
  rows,
  title,
  onOpenMenu,
  onPlay,
}: {
  rows: RecordingRowModel[];
  title: string;
  onOpenMenu: (id: string) => void;
  onPlay: (id: string) => void;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{`${title} · ${rows.length}`}</Text>
    {rows.map((row) => (
      <RecordingRow
        key={row.id}
        onOpenMenu={onOpenMenu}
        onPlay={onPlay}
        row={row}
      />
    ))}
  </View>
);

/**
 * The Recordings panel (rehearsal-recording design Decision 10): the recordings
 * of the playing track, adjusted track or loop, with the actions that exist so
 * far in each row's menu. Playing, queueing, playlists and export arrive with
 * their own tasks.
 */
export const RecordingsPanel = ({
  library,
  onClose,
  onPlay,
  sources,
  view,
  viewName,
}: RecordingsPanelProps) => {
  const { recordings, refresh } = useRecordingsList();
  const revision = useOfflineRevision();
  const [open, setOpen] = useState<OpenDialog>(null);
  const [playIssue, setPlayIssue] = useState<string | null>(null);
  const model = useMemo(
    () =>
      getRecordingsPanelModel({
        view,
        viewName,
        recordings: recordings ?? [],
        library,
        offline: {
          sources,
          stateOf: (driveFileId) => offlineStateStore.getState(driveFileId),
        },
        now: new Date(),
      }),
    // `revision` changes whenever any file's offline state does.
    [library, recordings, revision, sources, view, viewName],
  );
  const rows = [...model.main, ...model.loops.flatMap((group) => group.rows)];
  const target = rows.find((row) => row.id === open?.id);

  const rename = async (typed: string) => {
    if (target) {
      const name = resolveRecordingName(typed, target.name);

      if (name !== target.name) {
        await getRecordingsStore().update(target.id, { name });
        await refresh();
      }
    }

    setOpen(null);
  };

  const remove = async () => {
    if (target) {
      await getRecordingsStore().delete(target.id);
      await refresh();
    }

    setOpen(null);
  };

  const play = (id: string) => {
    const recording = recordings?.find((candidate) => candidate.id === id);

    setOpen(null);

    if (recording) {
      setPlayIssue(onPlay(recording));
    }
  };

  const menuActions = (row: RecordingRowModel): OptionsMenuAction[] => [
    {
      id: 'play',
      label: 'Play',
      onPress: () => play(row.id),
    },
    {
      id: 'offline',
      label: row.offline.label,
      disabled: row.offline.disabled,
      onPress: () => {
        const runner = getOfflineBatchRunner();

        setOpen(null);

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

  return (
    <>
      <BottomSheetSurface
        footer={
          <MenuGroup>
            <MenuRow label="Done" onPress={onClose} tone="cancel" />
          </MenuGroup>
        }
        isVisible
        onClose={onClose}
        scrollable
        title={model.title}
      >
        <View style={styles.body}>
          <Text style={styles.subtitle}>{model.subtitle}</Text>
          {playIssue ? <Text style={styles.issue}>{playIssue}</Text> : null}
          <Section
            onOpenMenu={(id) => setOpen({ kind: 'menu', id })}
            onPlay={play}
            rows={model.main}
            title={model.mainTitle}
          />
          {recordings && model.main.length === 0 ? (
            <Text style={styles.subtitle}>{model.emptyMessage}</Text>
          ) : null}
          {model.loops.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.loopsTitle}>{model.loopsTitle}</Text>
              {model.loops.map((group) => (
                <Section
                  key={group.loopId}
                  onOpenMenu={(id) => setOpen({ kind: 'menu', id })}
                  onPlay={play}
                  rows={group.rows}
                  title={`${group.name} loop`}
                />
              ))}
            </View>
          ) : null}
        </View>
      </BottomSheetSurface>
      {target && open?.kind === 'menu' ? (
        <OptionsMenuSheet
          actions={menuActions(target)}
          isVisible
          onClose={() => setOpen(null)}
          title={target.name}
        />
      ) : null}
      {target && open?.kind === 'rename' ? (
        <RenameRecordingDialog
          name={target.name}
          onCancel={() => setOpen(null)}
          onSave={(typed) => void rename(typed)}
        />
      ) : null}
      {target && open?.kind === 'delete' ? (
        <DeleteRecordingDialog
          name={target.name}
          onCancel={() => setOpen(null)}
          onDelete={() => void remove()}
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  body: { gap: space.sm },
  issue: { ...type.rowMeta, color: colors.danger },
  loopsTitle: { ...type.sectionHead, color: colors.warning },
  section: { gap: space.xxs },
  sectionTitle: { ...type.sectionHead, color: colors.textMuted },
  subtitle: { ...type.rowMeta, color: colors.textMuted },
});
