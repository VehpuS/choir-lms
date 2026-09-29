import { Pressable, StyleSheet } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { appTheme } from '../../utils/theme';

export const ACTION_BUTTON_SIZE = appTheme.space.touchTarget;

type DriveDiscoveryActionButtonProps = {
  accessibilityLabel: string;
  iconName: 'close' | 'magnify' | 'progress-clock' | 'refresh';
  isDisabled?: boolean;
  onPress: () => void;
};

export const DriveDiscoveryActionButton = ({
  accessibilityLabel,
  iconName,
  isDisabled = false,
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
        pressed ? styles.headerActionButtonPressed : undefined,
        isDisabled ? styles.headerActionButtonDisabled : undefined,
      ]}
    >
      <AppIcon color={appTheme.colors.text} name={iconName} size={18} />
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
    borderColor: appTheme.colors.borderButton,
    backgroundColor: appTheme.colors.transparent,
  },
  headerActionButtonDisabled: {
    opacity: 0.56,
  },
  headerActionButtonPressed: {
    opacity: 0.88,
  },
});
