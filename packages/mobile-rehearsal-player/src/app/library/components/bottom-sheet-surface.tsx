import { Modal, Pressable, StyleSheet, View } from 'react-native';

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
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
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
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  copyGroup: {
    gap: 6,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: BACKDROP,
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