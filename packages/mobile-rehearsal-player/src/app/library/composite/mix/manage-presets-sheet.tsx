import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import {
  BACK_LABEL,
  DEFAULT_META,
  DELETE_PRESET_LABEL,
  DELETE_PRESET_QUESTION,
  KEEP_PRESET_LABEL,
  MAKE_DEFAULT_LABEL,
  MANAGE_PRESETS_TITLE,
  MAX_PRESET_NAME_LENGTH,
  PRESET_NAME_LABEL,
  RENAME_PRESET_LABEL,
  resolveRenamePresetModel,
  type PresetMenuRow,
} from './preset-model';

const { colors, radius, space, type } = appTheme;

type ManagePresetsSheetProps = {
  presets: readonly PresetMenuRow[];
  onClose: () => void;
  onRename: (presetId: string, name: string) => void;
  onDelete: (presetId: string) => void;
  onMakeDefault: (row: PresetMenuRow) => void;
};

/** Saved presets: pick one to rename it, make it the default or delete it. */
export const ManagePresetsSheet = ({
  onClose,
  onDelete,
  onMakeDefault,
  onRename,
  presets,
}: ManagePresetsSheetProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isAskingToDelete, setIsAskingToDelete] = useState(false);
  const selected = presets.find((row) => row.id === selectedId) ?? null;
  const rename = selected
    ? resolveRenamePresetModel(name, selected, presets)
    : null;
  const back = () => {
    setSelectedId(null);
    setIsAskingToDelete(false);
  };

  return (
    <BottomSheetSurface
      footer={
        <MenuGroup>
          <MenuRow
            label={selected ? BACK_LABEL : 'Done'}
            onPress={selected ? back : onClose}
            tone="preferred"
          />
        </MenuGroup>
      }
      isVisible={true}
      onClose={onClose}
      scrollable={true}
      title={selected ? selected.name : MANAGE_PRESETS_TITLE}
    >
      <View style={styles.body}>
        {!selected ? (
          <MenuGroup>
            {presets.map((row) => (
              <MenuRow
                accessibilityLabel={`Manage ${row.name}`}
                align="leading"
                key={row.id}
                label={row.name}
                meta={row.isDefault ? DEFAULT_META : undefined}
                onPress={() => {
                  setSelectedId(row.id);
                  setName(row.name);
                }}
              />
            ))}
          </MenuGroup>
        ) : (
          <>
            <TextInput
              accessibilityLabel={PRESET_NAME_LABEL}
              autoCorrect={false}
              maxLength={MAX_PRESET_NAME_LENGTH}
              onChangeText={setName}
              style={styles.input}
              value={name}
            />
            <MenuGroup>
              <MenuRow
                disabled={!rename?.canRename}
                label={RENAME_PRESET_LABEL}
                onPress={() => {
                  onRename(selected.id, rename?.name ?? name);
                  back();
                }}
              />
              {selected.isDefault ? null : (
                <MenuRow
                  label={MAKE_DEFAULT_LABEL}
                  onPress={() => onMakeDefault(selected)}
                />
              )}
            </MenuGroup>
            {isAskingToDelete ? (
              <View style={styles.body}>
                <Text style={styles.question}>{DELETE_PRESET_QUESTION}</Text>
                <MenuGroup>
                  <MenuRow
                    label={DELETE_PRESET_LABEL}
                    onPress={() => {
                      onDelete(selected.id);
                      back();
                    }}
                    tone="destructive"
                  />
                  <MenuRow
                    label={KEEP_PRESET_LABEL}
                    onPress={() => setIsAskingToDelete(false)}
                  />
                </MenuGroup>
              </View>
            ) : (
              <MenuGroup>
                <MenuRow
                  label={DELETE_PRESET_LABEL}
                  onPress={() => setIsAskingToDelete(true)}
                  tone="destructive"
                />
              </MenuGroup>
            )}
          </>
        )}
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
  question: { ...type.rowTitle, color: colors.text },
});
