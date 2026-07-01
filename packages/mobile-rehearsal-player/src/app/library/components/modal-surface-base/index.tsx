import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ModalProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { resolveModalSurfaceLayout, type ModalSurfacePlacement } from './model';

type ModalSurfaceBaseProps = {
  backdropColor: string;
  children: ReactNode;
  isVisible: boolean;
  onRequestClose: () => void;
  surfaceStyle?: StyleProp<ViewStyle>;
  animationType?: ModalProps['animationType'];
  dismissOnBackdropPress?: boolean;
  placement?: ModalSurfacePlacement;
};

export const ModalSurfaceBase = ({
  animationType = 'fade',
  backdropColor,
  children,
  dismissOnBackdropPress = true,
  isVisible,
  onRequestClose,
  placement = 'bottom',
  surfaceStyle,
}: ModalSurfaceBaseProps) => {
  if (!isVisible) {
    return null;
  }

  const layout = resolveModalSurfaceLayout(placement);

  return (
    <Modal
      animationType={animationType}
      onRequestClose={onRequestClose}
      transparent
      visible
    >
      <View
        style={[
          styles.overlay,
          {
            alignItems: layout.alignItems,
            backgroundColor: backdropColor,
            justifyContent: layout.justifyContent,
            padding: layout.padding,
          },
        ]}
      >
        {dismissOnBackdropPress ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRequestClose}
            style={styles.backdrop}
          />
        ) : null}
        <View style={[styles.surface, surfaceStyle]}>{children}</View>
      </View>
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
  surface: {
    zIndex: 1,
  },
});
