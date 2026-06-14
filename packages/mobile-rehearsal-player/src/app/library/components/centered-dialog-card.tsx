import type { ReactNode } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { appTheme } from '../../utils/theme';

type CenteredDialogCardProps = {
  cardStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
  isVisible: boolean;
  onRequestClose: () => void;
};

const BACKDROP = 'rgba(31, 28, 23, 0.35)';

export const CenteredDialogCard = ({
  cardStyle,
  children,
  isVisible,
  onRequestClose,
}: CenteredDialogCardProps) => {
  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onRequestClose}
      transparent
      visible
    >
      <View style={styles.overlay}>
        <View style={[styles.card, cardStyle]}>{children}</View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 12,
    width: '92%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 16,
    padding: 16,
    backgroundColor: appTheme.colors.surfaceBackground,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: BACKDROP,
  },
});
