import { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import {
  MAKE_DEFAULT_SWITCH_LABEL,
  MAX_PRESET_NAME_LENGTH,
  PRESET_NAME_LABEL,
  SAVE_PRESET_HINT,
  SAVE_PRESET_LABEL,
  SAVE_PRESET_TITLE,
  resolveSavePresetModel,
} from './preset-model';

const { colors, radius, space, type } = appTheme;

type SavePresetSheetProps = {
  existingPresets: readonly { name: string }[];
  onCancel: () => void;
  onSave: (options: { name: string; makeDefault: boolean }) => void;
};

/** Names the session mix; optionally makes it the composite's default. */
export const SavePresetSheet = ({
  existingPresets,
  onCancel,
  onSave,
}: SavePresetSheetProps) => {
  const [name, setName] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const model = resolveSavePresetModel(name, existingPresets);

  return (
    <BottomSheetSurface
      footer={
        <MenuGroup>
          <MenuRow
            disabled={!model.canSave}
            label="Save"
            onPress={() => onSave({ name: model.name, makeDefault })}
            tone="preferred"
          />
          <MenuRow label="Cancel" onPress={onCancel} />
        </MenuGroup>
      }
      isVisible={true}
      onClose={onCancel}
      title={SAVE_PRESET_TITLE}
    >
      <View style={styles.body}>
        <Text style={styles.label}>{SAVE_PRESET_HINT}</Text>
        <TextInput
          accessibilityLabel={PRESET_NAME_LABEL}
          autoCorrect={false}
          maxLength={MAX_PRESET_NAME_LENGTH}
          onChangeText={setName}
          placeholder={SAVE_PRESET_LABEL}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          value={name}
        />
        {model.replacesNote ? (
          <Text style={styles.label}>{model.replacesNote}</Text>
        ) : null}
        <View style={styles.switchRow}>
          <Text style={styles.rowTitle}>{MAKE_DEFAULT_SWITCH_LABEL}</Text>
          <Switch
            accessibilityLabel={MAKE_DEFAULT_SWITCH_LABEL}
            onValueChange={setMakeDefault}
            trackColor={{ false: colors.borderChip, true: colors.accent }}
            value={makeDefault}
          />
        </View>
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
  rowTitle: { ...type.rowTitle, color: colors.text, flex: 1 },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    minHeight: space.touchTarget,
  },
});
