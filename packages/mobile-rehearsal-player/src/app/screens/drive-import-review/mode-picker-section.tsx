import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../utils/theme';
import type { DriveImportMode } from '../../library/saved-rehearsal-library/drive-import-planner';
import { getDriveImportReviewModeCopy } from './screen-copy';

type ModePickerSectionProps = {
  mode: DriveImportMode;
  onSelectMode: (mode: DriveImportMode) => void;
};

const ModeOption = ({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityState={{ selected: isSelected }}
    onPress={onPress}
    style={[styles.option, isSelected ? styles.optionSelected : undefined]}
  >
    <Text
      style={isSelected ? styles.optionLabelSelected : styles.optionLabel}
    >
      {label}
    </Text>
  </Pressable>
);

export const ModePickerSection = ({
  mode,
  onSelectMode,
}: ModePickerSectionProps) => {
  const copy = getDriveImportReviewModeCopy();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{copy.title}</Text>
      <View style={styles.optionRow}>
        <ModeOption
          isSelected={mode === 'preserve-structure'}
          label={copy.preserveStructureLabel}
          onPress={() => onSelectMode('preserve-structure')}
        />
        <ModeOption
          isSelected={mode === 'flatten'}
          label={copy.flattenLabel}
          onPress={() => onSelectMode('flatten')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  option: {
    flex: 1,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 8,
    backgroundColor: appTheme.colors.surfaceBackground,
  },
  optionLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 13,
    fontWeight: '700',
  },
  optionLabelSelected: {
    color: '#fff8ef',
    fontSize: 13,
    fontWeight: '700',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionSelected: {
    borderColor: appTheme.colors.listMarker,
    backgroundColor: appTheme.colors.listMarker,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
});
