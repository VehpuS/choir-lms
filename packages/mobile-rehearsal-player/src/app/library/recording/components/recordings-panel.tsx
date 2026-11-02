import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import { useOfflineRevision } from '../../offline/offline-state';
import { offlineStateStore } from '../../offline/offline-state';
import type {
  DriveAudioSource,
  Playlist,
  Recording,
} from '@org/audio-library-models';
import {
  getRecordingsPanelModel,
  type RecordingRow as RecordingRowModel,
  type RecordingsView,
} from '../recordings-panel-model';
import { useRecordingsList } from '../use-recordings-list';
import { RecordingRow } from './recording-row';
import {
  useRecordingRowMenu,
  type RecordingQueueServices,
} from './use-recording-row-menu';

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
  /** Queueing a recording, when something is playing. */
  queue: RecordingQueueServices;
  playlists: {
    savedPlaylists: Playlist[];
    createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
    updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  };
};

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
  playlists,
  queue,
  sources,
  view,
  viewName,
}: RecordingsPanelProps) => {
  const { recordings, refresh } = useRecordingsList();
  const revision = useOfflineRevision();
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
  const [notice, setNotice] = useState<string | null>(null);
  const { dialogs, openMenu, play, playIssue } = useRecordingRowMenu({
    onPlay,
    playlistServices: {
      createPlaylist: playlists.createPlaylist,
      onAdded: (acknowledgment) => setNotice(acknowledgment.message),
      playlists: playlists.savedPlaylists,
      updatePlaylist: playlists.updatePlaylist,
    },
    queueServices: { ...queue, onQueued: (ack) => setNotice(ack.message) },
    recordings,
    refresh,
    rows,
  });

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
          {notice ? <Text style={styles.subtitle}>{notice}</Text> : null}
          {playIssue ? <Text style={styles.issue}>{playIssue}</Text> : null}
          <Section
            onOpenMenu={openMenu}
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
                  onOpenMenu={openMenu}
                  onPlay={play}
                  rows={group.rows}
                  title={`${group.name} loop`}
                />
              ))}
            </View>
          ) : null}
        </View>
      </BottomSheetSurface>
      {dialogs}
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
