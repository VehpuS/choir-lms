import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { ariaStateProps } from '../../components/aria-state';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../components/interaction-guard';
import { appTheme } from '../../utils/theme';

const CHECKBOX_SIZE = 22;

type RememberChoiceRowProps = {
  checked: boolean;
  label: string;
  onToggle: () => void;
};

// The "Remember my choice" checkbox shared by the prompts that can skip
// themselves next time (bulk selections, the microphone).
export const RememberChoiceRow = ({
  checked,
  label,
  onToggle,
}: RememberChoiceRowProps) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    {...ariaStateProps({ checked })}
    {...interactionGuardProps}
    onPress={onToggle}
    style={[styles.row, buttonInteractionGuardStyle]}
  >
    <View style={[styles.checkbox, checked ? styles.checkboxOn : null]}>
      {checked ? (
        <AppIcon color={appTheme.colors.accentOnTint} name="check" size={16} />
      ) : null}
    </View>
    <Text style={styles.label}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  checkbox: {
    alignItems: 'center',
    borderColor: appTheme.colors.borderButton,
    borderRadius: appTheme.radius.sm,
    borderWidth: 1,
    height: CHECKBOX_SIZE,
    justifyContent: 'center',
    width: CHECKBOX_SIZE,
  },
  checkboxOn: {
    backgroundColor: appTheme.colors.surfaceAccent,
    borderColor: appTheme.colors.accent,
  },
  label: {
    color: appTheme.colors.text,
    fontSize: 15,
  },
  // 44pt row, the touch-target minimum, with the box inside it.
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: appTheme.space.sm,
    minHeight: appTheme.space.touchTarget,
  },
});
