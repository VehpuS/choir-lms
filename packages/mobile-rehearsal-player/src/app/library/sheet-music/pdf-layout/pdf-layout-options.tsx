import type { PdfLayout } from '@org/audio-library-models';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import {
  ONLY_FOR_THIS_FILE_LABEL,
  USE_DEVICE_LAYOUT_LABEL,
  type PdfLayoutSheetModel,
} from './pdf-layout-sheet-model';

type PdfLayoutOptionsProps = {
  isOnlyForThisFile: boolean;
  model: PdfLayoutSheetModel;
  onSelect: (layout: PdfLayout) => void;
  onToggleOnlyForThisFile: (value: boolean) => void;
  onUseDeviceLayout: () => void;
};

const CURRENT_META = 'Current';

/**
 * The layout sheet's content: the three layouts with the current one marked,
 * the `Only for this file` switch that decides where a choice is saved, and,
 * for a file with its own layout, a way back to the device layout.
 */
export const PdfLayoutOptions = ({
  isOnlyForThisFile,
  model,
  onSelect,
  onToggleOnlyForThisFile,
  onUseDeviceLayout,
}: PdfLayoutOptionsProps) => {
  return (
    <View style={styles.column}>
      <MenuGroup>
        {model.options.map((option) => (
          <MenuRow
            accessibilityLabel={
              option.isSelected ? `${option.label}, current` : option.label
            }
            align="leading"
            icon={option.icon}
            key={option.layout}
            label={option.label}
            meta={option.isSelected ? CURRENT_META : undefined}
            onPress={() => onSelect(option.layout)}
            tone={option.isSelected ? 'preferred' : 'default'}
          />
        ))}
      </MenuGroup>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{ONLY_FOR_THIS_FILE_LABEL}</Text>
        <Switch
          accessibilityLabel={ONLY_FOR_THIS_FILE_LABEL}
          onValueChange={onToggleOnlyForThisFile}
          trackColor={{
            false: appTheme.colors.borderChip,
            true: appTheme.colors.accent,
          }}
          value={isOnlyForThisFile}
        />
      </View>
      {model.ownLayoutNote ? (
        <Text style={styles.note}>{model.ownLayoutNote}</Text>
      ) : null}
      {model.deviceNote ? (
        <Text style={styles.note}>{model.deviceNote}</Text>
      ) : null}
      {model.canUseDeviceLayout ? (
        <MenuGroup>
          <MenuRow
            accessibilityLabel={USE_DEVICE_LAYOUT_LABEL}
            align="leading"
            label={USE_DEVICE_LAYOUT_LABEL}
            onPress={onUseDeviceLayout}
          />
        </MenuGroup>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    gap: appTheme.space.sm,
  },
  note: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.textMuted,
  },
  switchLabel: {
    ...appTheme.type.rowTitle,
    flex: 1,
    color: appTheme.colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.sm,
    minHeight: appTheme.space.touchTarget,
    paddingHorizontal: appTheme.space.xs,
  },
});
