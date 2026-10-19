import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderHandlers,
} from 'react-native';

import { appTheme } from '../../utils/theme';
import { AppIcon } from '../app-icon';
import { DragHandle } from '../drag-handle';

const STEP_ICON_SIZE = 12;
const PRESSED_OPACITY = 0.88;
const DISABLED_OPACITY = 0.56;

type ReorderControlsProps = {
  canDrag: boolean;
  disabled?: boolean;
  index: number;
  itemCount: number;
  /** Names the item for assistive technology: `Move <label> up`. */
  label: string;
  onMove: (from: number, to: number) => void;
  panHandlers: GestureResponderHandlers;
};

/** The up and down arrows plus the drag handle, in one place for every list. */
export const ReorderControls = ({
  canDrag,
  disabled = false,
  index,
  itemCount,
  label,
  onMove,
  panHandlers,
}: ReorderControlsProps) => {
  const canMoveUp = !disabled && index > 0;
  const canMoveDown = !disabled && index < itemCount - 1;

  return (
    <>
      <View style={styles.stepper}>
        <StepButton
          accessibilityLabel={`Move ${label} up`}
          enabled={canMoveUp}
          icon="chevron-up"
          onPress={() => onMove(index, index - 1)}
        />
        <View style={styles.divider} />
        <StepButton
          accessibilityLabel={`Move ${label} down`}
          enabled={canMoveDown}
          icon="chevron-down"
          onPress={() => onMove(index, index + 1)}
        />
      </View>
      <DragHandle
        accessibilityLabel={`Drag ${label} to reorder`}
        canDrag={canDrag && !disabled}
        panHandlers={panHandlers}
      />
    </>
  );
};

const StepButton = (props: {
  accessibilityLabel: string;
  enabled: boolean;
  icon: 'chevron-up' | 'chevron-down';
  onPress: () => void;
}) => (
  <Pressable
    accessibilityLabel={props.accessibilityLabel}
    accessibilityRole="button"
    disabled={!props.enabled}
    onPress={props.onPress}
    style={({ pressed }) => [
      styles.stepButton,
      pressed && props.enabled ? styles.pressed : undefined,
      !props.enabled ? styles.disabled : undefined,
    ]}
  >
    <AppIcon
      color={appTheme.colors.textMuted}
      name={props.icon}
      size={STEP_ICON_SIZE}
    />
  </Pressable>
);

const styles = StyleSheet.create({
  disabled: { opacity: DISABLED_OPACITY },
  divider: {
    backgroundColor: appTheme.colors.border,
    height: StyleSheet.hairlineWidth,
  },
  pressed: { opacity: PRESSED_OPACITY },
  stepButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  stepper: {
    borderColor: appTheme.colors.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 38,
    overflow: 'hidden',
    width: 22,
  },
});
