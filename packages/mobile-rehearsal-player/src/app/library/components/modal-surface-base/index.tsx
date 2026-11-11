import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ModalProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useKeyboardInset } from '../../../components/keyboard-safe/use-keyboard-inset';
import { SafeAreaFrame } from '../../../components/safe-area-frame';
import {
  resolveKeyboardAvoidingBehavior,
  resolveModalSurfaceLayout,
  resolveModalSurfaceMaxHeight,
  resolveSideSheetSurfaceStyle,
  type ModalSurfacePlacement,
  type ModalSurfacePresentation,
} from './model';

type ModalSurfaceBaseProps = {
  backdropColor: string;
  children: ReactNode;
  isVisible: boolean;
  onRequestClose: () => void;
  surfaceStyle?: StyleProp<ViewStyle>;
  animationType?: ModalProps['animationType'];
  dismissOnBackdropPress?: boolean;
  placement?: ModalSurfacePlacement;
  /** `side-sheet` shows a bottom sheet as a full-height panel on the trailing edge. */
  presentation?: ModalSurfacePresentation;
};

export const ModalSurfaceBase = ({
  animationType = 'fade',
  backdropColor,
  children,
  dismissOnBackdropPress = true,
  isVisible,
  onRequestClose,
  placement = 'bottom',
  presentation = 'default',
  surfaceStyle,
}: ModalSurfaceBaseProps) => {
  // On the web the soft keyboard covers the bottom without resizing anything:
  // pad by its height so the surface, and its scroll area, end above it.
  const keyboardInset = useKeyboardInset();

  if (!isVisible) {
    return null;
  }

  const layout = resolveModalSurfaceLayout(placement, presentation);
  const isSideSheet = presentation === 'side-sheet';

  return (
    <Modal
      animationType={animationType}
      onRequestClose={onRequestClose}
      transparent
      visible
    >
      <KeyboardAvoidingView
        behavior={resolveKeyboardAvoidingBehavior(Platform.OS)}
        style={[styles.overlay, { backgroundColor: backdropColor }]}
      >
        {dismissOnBackdropPress ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRequestClose}
            style={styles.backdrop}
          />
        ) : null}
        {/* The backdrop above reaches the screen edges; the surface keeps clear of the safe areas. */}
        <SafeAreaFrame>
          {/* The layout's padding sits inside the frame: a padding on the frame itself would replace the inset. */}
          <View
            pointerEvents="box-none"
            style={[
              styles.placement,
              {
                alignItems: layout.alignItems,
                justifyContent: layout.justifyContent,
                padding: layout.padding,
                paddingBottom: Number(layout.padding ?? 0) + keyboardInset,
              },
            ]}
          >
            <View
              style={[
                styles.surface,
                {
                  maxHeight: resolveModalSurfaceMaxHeight(
                    placement,
                    presentation,
                  ),
                },
                surfaceStyle,
                isSideSheet ? resolveSideSheetSurfaceStyle() : null,
              ]}
            >
              {children}
            </View>
          </View>
        </SafeAreaFrame>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
  },
  placement: {
    flex: 1,
  },
  surface: {
    zIndex: 1,
  },
});
