import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { appTheme } from '../../utils/theme';
import { ModalSurfaceBase } from './modal-surface-base';

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
    <ModalSurfaceBase
      backdropColor={BACKDROP}
      dismissOnBackdropPress={false}
      isVisible={isVisible}
      onRequestClose={onRequestClose}
      placement="center"
      surfaceStyle={[styles.card, cardStyle]}
    >
      {children}
    </ModalSurfaceBase>
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
});
