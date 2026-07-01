import { StyleSheet } from 'react-native';

import { ModalSurfaceBase } from './modal-surface-base';
import { SectionHeading } from './section-heading';

type BottomSheetSurfaceProps = {
  children: React.ReactNode;
  eyebrow?: string;
  isVisible: boolean;
  onClose: () => void;
  title?: string;
};

const BACKDROP = 'rgba(20, 18, 13, 0.42)';
const CARD_BACKGROUND = '#fffdf8';

export const BottomSheetSurface = ({
  children,
  eyebrow,
  isVisible,
  onClose,
  title,
}: BottomSheetSurfaceProps) => {
  if (!isVisible) {
    return null;
  }

  return (
    <ModalSurfaceBase
      backdropColor={BACKDROP}
      isVisible={isVisible}
      onRequestClose={onClose}
      placement="bottom"
      surfaceStyle={styles.sheet}
    >
      {eyebrow || title ? (
        <SectionHeading
          eyebrow={eyebrow}
          style={styles.copyGroup}
          title={title}
          titleNumberOfLines={1}
          titleStyle={styles.title}
        />
      ) : null}
      {children}
    </ModalSurfaceBase>
  );
};

const styles = StyleSheet.create({
  copyGroup: {
    gap: 6,
  },
  sheet: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: CARD_BACKGROUND,
  },
  title: {
    color: '#1f1c17',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
});
