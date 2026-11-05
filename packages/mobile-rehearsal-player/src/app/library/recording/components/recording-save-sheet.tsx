import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { RecordingBalanceSlider } from '../overlay/recording-balance-slider';
import { RecordingLevelControl } from '../overlay/recording-level-control';
import type { SavedMix } from './use-saved-recording-mix';
import { LibraryFilesConfirmationDialog } from '../../selection/library-files-confirmation-dialog';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import {
  getSaveSheetDeleteConfirmation,
  MAX_RECORDING_NAME_LENGTH,
  SAVE_SHEET_COPY,
  type SaveSheetModel,
} from '../recording-save-sheet-model';

const { colors, space, radius, type } = appTheme;

const MARKER_SPAN_LINES = 2;

export const RECORDING_NAME_FIELD_LABEL = 'Recording name';

type RecordingSaveSheetProps = {
  model: SaveSheetModel;
  /** The saved name; the field starts on it. */
  name: string;
  recordingId: string;
  /** The saved balance the slider starts at (0 to 100), and the saved level in dB. */
  balance: number;
  levelDb: number;
  /** Called with both when the sheet is done or leaves for export. */
  onSetMix: (mix: SavedMix) => void;
  /** Plays the recording over its track at this balance and level, so it can be heard. */
  onPreview: (mix: SavedMix) => void;
  /** Either moved while it may be playing; the sound follows it. */
  onPreviewMixChange: (mix: SavedMix) => void;
  /** Stops a preview when the sheet is left. */
  onStopPreview: () => void;
  /** Called with whatever is typed when the sheet is done or leaves the name field. */
  onRename: (typed: string) => void;
  onDone: () => void;
  onDelete: () => void;
  onTurnOnAutoExport: () => void;
  /** Absent until the export dialog exists; the row is then left out. */
  onExport?: () => void;
};

const Detail = ({ children }: { children: string }) => (
  <Text style={styles.detail}>{children}</Text>
);

/**
 * The sheet shown when a take has been saved (design Decisions 8 and 19): the
 * name to edit, what was recorded, where it lives, and the auto-export state.
 * Delete asks first in a dialog, because the take is not recoverable.
 */
export const RecordingSaveSheet = ({
  model,
  balance: savedBalance,
  levelDb: savedLevelDb,
  recordingId,
  name,
  onDelete,
  onDone,
  onExport,
  onRename,
  onPreview,
  onPreviewMixChange,
  onSetMix,
  onStopPreview,
  onTurnOnAutoExport,
}: RecordingSaveSheetProps) => {
  const [typed, setTyped] = useState(name);
  const [balance, setBalance] = useState(savedBalance);
  const [levelDb, setLevelDb] = useState(savedLevelDb);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { autoExport } = model;

  const changeBalance = (next: number) => {
    setBalance(next);
    onPreviewMixChange({ balance: next, levelDb });
  };

  const changeLevel = (next: number) => {
    setLevelDb(next);
    onPreviewMixChange({ balance, levelDb: next });
  };

  const finish = () => {
    onStopPreview();
    onRename(typed);
    onSetMix({ balance, levelDb });
    onDone();
  };

  return (
    <BottomSheetSurface
      footer={
        <MenuGroup>
          {onExport ? (
            <MenuRow
              label={SAVE_SHEET_COPY.exportLabel}
              onPress={() => {
                onStopPreview();
                onRename(typed);
                onSetMix({ balance, levelDb });
                onExport();
              }}
            />
          ) : null}
          <MenuRow
            label={SAVE_SHEET_COPY.deleteLabel}
            onPress={() => setConfirmingDelete(true)}
            tone="destructive"
          />
          <MenuRow
            label={SAVE_SHEET_COPY.doneLabel}
            onPress={finish}
            tone="preferred"
          />
        </MenuGroup>
      }
      isVisible={true}
      onClose={finish}
      scrollable={true}
      title={model.title}
    >
      <View style={styles.body}>
        <Detail>{model.summary}</Detail>
        {model.markerSpan ? (
          <Text numberOfLines={MARKER_SPAN_LINES} style={styles.markerSpan}>
            {model.markerSpan}
          </Text>
        ) : null}
        {model.timeSpan ? <Detail>{model.timeSpan}</Detail> : null}
        {model.notice ? (
          <Text style={model.noticeIsProblem ? styles.notice : styles.detail}>
            {model.notice}
          </Text>
        ) : null}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{SAVE_SHEET_COPY.nameLabel}</Text>
          <TextInput
            accessibilityLabel={RECORDING_NAME_FIELD_LABEL}
            autoCorrect={false}
            maxLength={MAX_RECORDING_NAME_LENGTH}
            onChangeText={setTyped}
            onSubmitEditing={finish}
            returnKeyType="done"
            selectTextOnFocus
            style={styles.input}
            value={typed}
          />
        </View>
        <View style={styles.field}>
          <View style={styles.balanceHeader}>
            <Text style={styles.fieldLabel}>
              {SAVE_SHEET_COPY.balanceLabel}
            </Text>
            <OutlinedActionButton
              icon="play"
              label={SAVE_SHEET_COPY.previewLabel}
              onPress={() => onPreview({ balance, levelDb })}
            />
          </View>
          <RecordingBalanceSlider onChange={changeBalance} value={balance} />
          <RecordingLevelControl
            levelDb={levelDb}
            onChange={changeLevel}
            recordingId={recordingId}
          />
          <Detail>{SAVE_SHEET_COPY.balanceNote}</Detail>
        </View>
        <Detail>{model.storedNote}</Detail>
        <View style={styles.autoExport}>
          <View style={styles.autoExportText}>
            <Text style={styles.autoExportTitle}>{autoExport.title}</Text>
            <Detail>{autoExport.detail}</Detail>
          </View>
          {autoExport.percent !== undefined ? (
            <Text style={styles.detail}>{`${autoExport.percent}%`}</Text>
          ) : null}
          {autoExport.turnOn ? (
            <OutlinedActionButton
              label={autoExport.turnOn.label}
              onPress={onTurnOnAutoExport}
            />
          ) : null}
        </View>
      </View>
      <LibraryFilesConfirmationDialog
        content={
          confirmingDelete
            ? getSaveSheetDeleteConfirmation(typed || name)
            : null
        }
        isMutating={false}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          onStopPreview();
          onDelete();
        }}
      />
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  autoExport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  autoExportText: { flex: 1, gap: space.xxs },
  autoExportTitle: { ...type.rowTitle, color: colors.text },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  body: { gap: space.sm },
  detail: { ...type.rowMeta, color: colors.textMuted },
  field: { gap: space.xxs },
  fieldLabel: { ...type.rowMeta, color: colors.textMuted },
  input: {
    minHeight: space.touchTarget,
    borderWidth: 1,
    borderColor: colors.borderChip,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    color: colors.text,
    fontSize: type.input.fontSize,
    backgroundColor: colors.surface,
  },
  markerSpan: { ...type.rowTitle, color: colors.text },
  notice: { ...type.rowMeta, color: colors.danger },
});
