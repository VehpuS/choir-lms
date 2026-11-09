import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import {
  MAX_COMPOSITE_NAME_LENGTH,
  RENAME_FIELD_LABEL,
  RENAME_TITLE,
  resolveRenameModel,
} from './composite-row-actions';

const { colors, radius, space, type } = appTheme;

type CompositeRenameSheetProps = {
  currentName: string;
  onCancel: () => void;
  onSave: (name: string) => void;
};

/** Renames a composite; the stems keep their own names. */
export const CompositeRenameSheet = ({
  currentName,
  onCancel,
  onSave,
}: CompositeRenameSheetProps) => {
  const [typed, setTyped] = useState(currentName);
  const model = resolveRenameModel(typed, currentName);

  return (
    <BottomSheetSurface
      footer={
        <MenuGroup>
          <MenuRow
            disabled={!model.canSave}
            label="Save"
            onPress={() => onSave(model.name)}
            tone="preferred"
          />
          <MenuRow label="Cancel" onPress={onCancel} />
        </MenuGroup>
      }
      isVisible={true}
      onClose={onCancel}
      title={RENAME_TITLE}
    >
      <View style={styles.body}>
        <Text style={styles.label}>{RENAME_FIELD_LABEL}</Text>
        <TextInput
          accessibilityLabel={RENAME_FIELD_LABEL}
          autoCorrect={false}
          autoFocus
          maxLength={MAX_COMPOSITE_NAME_LENGTH}
          onChangeText={setTyped}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          value={typed}
        />
      </View>
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  body: { gap: space.md },
  input: {
    ...type.rowTitle,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: space.touchTarget,
    paddingHorizontal: space.lg,
  },
  label: { ...type.rowMeta, color: colors.textMuted },
});
