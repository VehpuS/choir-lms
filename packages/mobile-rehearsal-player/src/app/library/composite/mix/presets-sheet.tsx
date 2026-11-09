import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import {
  BUILT_IN_GROUP_LABEL,
  DEFAULT_META,
  MAKE_DEFAULT_LABEL,
  MANAGE_PRESETS_LABEL,
  PRESETS_MENU_TITLE,
  RESET_LABEL,
  SAVED_GROUP_LABEL,
  type PresetMenuModel,
  type PresetMenuRow,
} from './preset-model';

const { colors, space, type } = appTheme;

type PresetsSheetProps = {
  model: PresetMenuModel;
  onClose: () => void;
  onChoose: (row: PresetMenuRow) => void;
  onReset: () => void;
  onMakeDefault: () => void;
  /** Opens the sheet that renames and deletes saved presets. */
  onManage: () => void;
};

const presetLabel = (row: PresetMenuRow) =>
  row.subtitle ? `${row.name} · ${row.subtitle}` : row.name;

/** Built-in and saved presets, and the actions on the session mix. */
export const PresetsSheet = ({
  model,
  onChoose,
  onClose,
  onMakeDefault,
  onManage,
  onReset,
}: PresetsSheetProps) => {
  const renderRows = (rows: PresetMenuRow[]) =>
    rows.map((row) => (
      <MenuRow
        accessibilityLabel={row.name}
        align="leading"
        icon={row.isCurrent ? 'check' : undefined}
        key={row.id}
        label={presetLabel(row)}
        meta={row.isDefault ? DEFAULT_META : undefined}
        onPress={() => onChoose(row)}
        tone={row.isCurrent ? 'preferred' : 'default'}
      />
    ));

  return (
    <BottomSheetSurface
      isVisible={true}
      onClose={onClose}
      scrollable={true}
      title={PRESETS_MENU_TITLE}
    >
      <View style={styles.body}>
        <Text style={styles.group}>{BUILT_IN_GROUP_LABEL}</Text>
        <MenuGroup>{renderRows(model.builtIn)}</MenuGroup>
        {model.saved.length > 0 ? (
          <>
            <Text style={styles.group}>{SAVED_GROUP_LABEL}</Text>
            <MenuGroup>{renderRows(model.saved)}</MenuGroup>
            <MenuGroup>
              <MenuRow label={MANAGE_PRESETS_LABEL} onPress={onManage} />
            </MenuGroup>
          </>
        ) : null}
        {model.canReset || model.canMakeDefault ? (
          <MenuGroup>
            {model.canReset ? (
              <MenuRow label={RESET_LABEL} onPress={onReset} />
            ) : null}
            {model.canMakeDefault ? (
              <MenuRow label={MAKE_DEFAULT_LABEL} onPress={onMakeDefault} />
            ) : null}
          </MenuGroup>
        ) : null}
      </View>
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  body: { gap: space.md },
  group: {
    ...type.rowMeta,
    color: colors.textFaint,
    textTransform: 'uppercase',
  },
});
