import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type BottomSheetSurfaceProps = {
  children: React.ReactNode;
  eyebrow?: string;
  isVisible: boolean;
  onClose: () => void;
  title?: string;
};

const BACKDROP = 'rgba(20, 18, 13, 0.42)';
const CARD_BACKGROUND = '#fffdf8';
const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_TEXT = '#5f5647';

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
            <View style={styles.copyGroup}>
              {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
              {title ? (
                <Text numberOfLines={1} style={styles.title}>
                  {title}
                </Text>
              ) : null}
            </View>
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
  eyebrow: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
    color: PRIMARY_TEXT,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
});