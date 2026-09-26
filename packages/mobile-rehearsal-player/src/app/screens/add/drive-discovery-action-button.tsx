import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { appTheme } from '../../utils/theme';

export const ACTION_BUTTON_SIZE = 40;

type DriveDiscoveryActionButtonProps = {
  accessibilityLabel: string;
  iconName: 'close' | 'magnify' | 'progress-clock' | 'refresh';
  isDisabled?: boolean;
  isFilled?: boolean;
  onPress: () => void;
};

export const DriveDiscoveryActionButton = ({
  accessibilityLabel,
  iconName,
  isDisabled = false,
  isFilled = false,
  onPress,
}: DriveDiscoveryActionButtonProps) => {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerActionButton,
        isFilled
          ? styles.headerActionButtonFilled
          : styles.headerActionButtonOutline,
        pressed ? styles.headerActionButtonPressed : undefined,
        isDisabled ? styles.headerActionButtonDisabled : undefined,
      ]}
    >
      <MaterialCommunityIcons
        color={isFilled ? appTheme.colors.accentOnTint : appTheme.colors.text}
        name={iconName}
        size={18}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  headerActionButton: {
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerActionButtonDisabled: {
    opacity: 0.56,
  },
  headerActionButtonFilled: {
    borderColor: appTheme.colors.accent,
    backgroundColor: appTheme.colors.surfaceAccent,
  },
  headerActionButtonOutline: {
    borderColor: appTheme.colors.borderButton,
    backgroundColor: appTheme.colors.transparent,
  },
  headerActionButtonPressed: {
    opacity: 0.88,
  },
});
