import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import { SegmentedControl } from '../../components/segmented-control';
import type { AutoExportWhat, Recording } from '@org/audio-library-models';
import {
  useAutoExportController,
  type AutoExportControllerState,
} from '../../library/recording/export/auto-export-controller';
import type {
  AutoExportSettings,
  UploadOver,
} from '../../library/recording/export/auto-export-model';
import {
  autoExportSettingsStore,
  useAutoExportSettings,
} from '../../library/recording/export/auto-export-settings-store';
import { canTellConnectionType } from '../../library/recording/export/connectivity';
import {
  requestDriveWriteAccess,
  requestExportFolderChoice,
  useDriveSessionState,
} from '../../library/recording/export/drive-session-bridge';
import { useRecordingsList } from '../../library/recording/use-recordings-list';
import { appTheme } from '../../utils/theme';
import {
  AUTO_EXPORT_COPY,
  buildAutoExportSettingsView,
  type AutoExportSettingsView,
} from './recordings-auto-export-model';

const { colors, radius, space, type } = appTheme;

const UPLOAD_OVER_OPTIONS: ReadonlyArray<{ label: string; value: UploadOver }> =
  [
    { label: AUTO_EXPORT_COPY.uploadOverWifiLabel, value: 'wifi' },
    { label: AUTO_EXPORT_COPY.uploadOverAnyLabel, value: 'any' },
  ];
const WHAT_OPTIONS: ReadonlyArray<{ label: string; value: AutoExportWhat }> = [
  { label: AUTO_EXPORT_COPY.whatRecordingLabel, value: 'recording' },
  { label: AUTO_EXPORT_COPY.whatMixLabel, value: 'mix' },
  { label: AUTO_EXPORT_COPY.whatBothLabel, value: 'both' },
];

export type RecordingsAutoExportSectionViewProps = {
  view: AutoExportSettingsView;
  settings: AutoExportSettings;
  isAuthorizing: boolean;
  onToggle: (enabled: boolean) => void;
  onAllow: () => void;
  onChangeFolder: () => void;
  onSelectUploadOver: (value: UploadOver) => void;
  onSelectWhat: (value: AutoExportWhat) => void;
  onBackUp: () => void;
};

/** The auto-export controls, given their data so they render without browser storage. */
export const RecordingsAutoExportSectionView = ({
  isAuthorizing,
  onAllow,
  onBackUp,
  onChangeFolder,
  onSelectUploadOver,
  onSelectWhat,
  onToggle,
  settings,
  view,
}: RecordingsAutoExportSectionViewProps) => (
  <View style={styles.section}>
    <Pressable
      accessibilityLabel={AUTO_EXPORT_COPY.switchTitle}
      accessibilityRole="switch"
      accessibilityState={{ checked: view.enabled }}
      onPress={() => onToggle(!view.enabled)}
      style={styles.row}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{AUTO_EXPORT_COPY.switchTitle}</Text>
        <Text style={styles.body}>{view.switchDetail}</Text>
      </View>
      <View style={[styles.track, view.enabled ? styles.trackOn : null]}>
        <View style={[styles.thumb, view.enabled ? styles.thumbOn : null]} />
      </View>
    </Pressable>
    {view.enabled ? (
      <>
        {view.allow ? (
          <View style={styles.group}>
            <Text style={styles.rowTitle}>{view.allow.title}</Text>
            <Text style={styles.body}>{view.allow.body}</Text>
            <OutlinedActionButton
              disabled={isAuthorizing}
              isBusy={isAuthorizing}
              label={view.allow.label}
              onPress={onAllow}
            />
          </View>
        ) : null}
        {view.statusNote ? (
          <Text style={styles.body}>{view.statusNote}</Text>
        ) : null}
        {view.folder ? (
          <Pressable
            accessibilityLabel={`${AUTO_EXPORT_COPY.folderTitle} ${view.folder.name}`}
            accessibilityRole="button"
            onPress={onChangeFolder}
            style={styles.row}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>
                {AUTO_EXPORT_COPY.folderTitle}
              </Text>
              <Text style={view.folder.isError ? styles.error : styles.body}>
                {view.folder.note}
              </Text>
            </View>
            <Text style={styles.value}>{view.folder.name}</Text>
            <Text style={styles.link}>
              {AUTO_EXPORT_COPY.changeFolderLabel}
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.group}>
          <Text style={styles.rowTitle}>
            {AUTO_EXPORT_COPY.uploadOverTitle}
          </Text>
          <SegmentedControl
            accessibilityLabel={AUTO_EXPORT_COPY.uploadOverTitle}
            onSelect={onSelectUploadOver}
            options={UPLOAD_OVER_OPTIONS}
            selectedValue={settings.uploadOver}
          />
          <Text style={styles.body}>{view.uploadOverNote}</Text>
        </View>
        <View style={styles.group}>
          <Text style={styles.rowTitle}>{AUTO_EXPORT_COPY.exportTitle}</Text>
          <SegmentedControl
            accessibilityLabel={AUTO_EXPORT_COPY.exportTitle}
            onSelect={onSelectWhat}
            options={WHAT_OPTIONS}
            selectedValue={settings.what}
          />
          <Text style={styles.body}>{AUTO_EXPORT_COPY.whatNote}</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{AUTO_EXPORT_COPY.backUpTitle}</Text>
            <Text style={styles.body}>{view.backUp.detail}</Text>
          </View>
          <OutlinedActionButton
            disabled={view.backUp.count === 0}
            label={AUTO_EXPORT_COPY.backUpLabel}
            onPress={onBackUp}
          />
        </View>
      </>
    ) : null}
  </View>
);

/** The auto-export controls wired to the settings, the Drive session and the queue. */
export const RecordingsAutoExportSection = () => {
  const settings = useAutoExportSettings();
  const session = useDriveSessionState();
  const controller: AutoExportControllerState = useAutoExportController();
  const { recordings } = useRecordingsList();
  const view = buildAutoExportSettingsView({
    canTellConnectionType: canTellConnectionType(),
    folderState: controller.folder,
    hasWriteAccess: session.hasWriteAccess,
    recordings: (recordings ?? []) as readonly Recording[],
    settings,
    status: controller.status,
  });

  return (
    <RecordingsAutoExportSectionView
      isAuthorizing={session.isBusy}
      onAllow={requestDriveWriteAccess}
      onBackUp={() =>
        void autoExportSettingsStore.change({ type: 'back-up-existing' })
      }
      onChangeFolder={requestExportFolderChoice}
      onSelectUploadOver={(uploadOver) =>
        void autoExportSettingsStore.change({
          type: 'set-upload-over',
          uploadOver,
        })
      }
      onSelectWhat={(what) =>
        void autoExportSettingsStore.change({ type: 'set-what', what })
      }
      onToggle={(enabled) => {
        void autoExportSettingsStore.change({
          type: enabled ? 'enable' : 'disable',
        });

        // Turning it on asks for the write permission once, here, if it is missing.
        if (enabled && !session.hasWriteAccess) {
          requestDriveWriteAccess();
        }
      }}
      settings={settings}
      view={view}
    />
  );
};

const TRACK_WIDTH = 36;
const TRACK_HEIGHT = 20;
const THUMB_SIZE = 16;
const THUMB_INSET = 2;

const styles = StyleSheet.create({
  body: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  group: { gap: space.xs },
  link: { ...type.rowMeta, color: colors.accent },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    minHeight: space.touchTarget,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: appTheme.fontWeight.medium,
  },
  section: { gap: space.lg },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginLeft: THUMB_INSET,
    borderRadius: radius.md,
    backgroundColor: colors.textMuted,
  },
  thumbOn: {
    marginLeft: TRACK_WIDTH - THUMB_SIZE - THUMB_INSET,
    backgroundColor: colors.text,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.divider,
  },
  trackOn: { backgroundColor: colors.accent },
  value: { color: colors.text, fontSize: 15 },
});
