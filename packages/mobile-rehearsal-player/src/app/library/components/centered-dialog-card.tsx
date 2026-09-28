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

const BACKDROP = appTheme.colors.scrim;

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
    ...appTheme.elevation.raised,
    gap: appTheme.space.sm,
    width: '100%',
    maxWidth: 420,
    borderRadius: appTheme.radius.md,
    padding: appTheme.space.lg,
    backgroundColor: appTheme.colors.surface,
  },
});
