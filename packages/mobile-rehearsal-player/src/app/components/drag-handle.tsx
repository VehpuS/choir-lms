import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View, type GestureResponderHandlers } from 'react-native';

import { appTheme } from '../utils/theme';

const DRAG_HANDLE_ICON_SIZE = 18;

type DragHandleProps = {
  accessibilityLabel: string;
  canDrag: boolean;
  panHandlers: GestureResponderHandlers;
};

// Shared by playlist-detail and Up Next/queue reorderable rows so both
// surfaces present the same drag-handle icon, size, and trailing placement
// (mobile-rehearsal-player-ui: "Drag handles use one consistent icon and
// edge placement across reorderable surfaces").
export const DragHandle = ({
  accessibilityLabel,
  canDrag,
  panHandlers,
}: DragHandleProps) => {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityState={{ disabled: !canDrag }}
      style={[styles.handle, !canDrag ? styles.handleDisabled : null]}
      {...(canDrag ? panHandlers : {})}
    >
      <MaterialCommunityIcons
        color={appTheme.colors.secondaryText}
        name="drag-vertical"
        size={DRAG_HANDLE_ICON_SIZE}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  handle: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  handleDisabled: {
    opacity: 0.5,
  },
});
