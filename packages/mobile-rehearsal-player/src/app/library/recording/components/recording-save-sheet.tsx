import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import {
  MAX_RECORDING_NAME_LENGTH,
  SAVE_SHEET_COPY,
  type SaveSheetModel,
} from '../recording-save-sheet-model';

const { colors, space, radius, type } = appTheme;

export const RECORDING_NAME_FIELD_LABEL = 'Recording name';

type RecordingSaveSheetProps = {
  model: SaveSheetModel;
  /** The saved name; the field starts on it. */
  name: string;
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
 * Delete asks twice, because the take is not recoverable.
 */
export const RecordingSaveSheet = ({
  model,
  name,
  onDelete,
  onDone,
  onExport,
  onRename,
  onTurnOnAutoExport,
}: RecordingSaveSheetProps) => {
  const [typed, setTyped] = useState(name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { autoExport } = model;

  const finish = () => {
    onRename(typed);
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
                onRename(typed);
                onExport();
              }}
            />
          ) : null}
          <MenuRow
            label={
              confirmingDelete
                ? SAVE_SHEET_COPY.confirmDeleteLabel
                : SAVE_SHEET_COPY.deleteLabel
            }
            onPress={() =>
              confirmingDelete ? onDelete() : setConfirmingDelete(true)
            }
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
          <Text style={styles.markerSpan}>{model.markerSpan}</Text>
        ) : null}
        {model.timeSpan ? <Detail>{model.timeSpan}</Detail> : null}
        {model.notice ? (
          <Text style={styles.notice}>{model.notice}</Text>
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
