import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  LOOP_SELECTOR_PRIMARY_TEXT,
  LOOP_SELECTOR_SECONDARY_ACTION_BACKGROUND,
  LOOP_SELECTOR_SECONDARY_TEXT,
} from './shared';

type LoopRangeSelectorHeaderProps = {
  eyebrowLabel: string;
  isTipsVisible: boolean;
  onClose: () => void;
  onToggleTips: () => void;
  title: string;
};

export const LoopRangeSelectorHeader = ({
  eyebrowLabel,
  isTipsVisible,
  onClose,
  onToggleTips,
  title,
}: LoopRangeSelectorHeaderProps) => {
  return (
    <>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{eyebrowLabel}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            pressed ? styles.buttonPressed : undefined,
          ]}
        >
          <Text style={styles.closeButtonLabel}>Close</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isTipsVisible }}
        onPress={onToggleTips}
        style={({ pressed }) => [
          styles.helpToggle,
          pressed ? styles.buttonPressed : undefined,
        ]}
      >
        <Text style={styles.helpToggleLabel}>
          {isTipsVisible ? 'Hide loop tips' : 'Show loop tips'}
        </Text>
      </Pressable>

      {isTipsVisible ? (
        <View style={styles.helpCard}>
          <Text style={styles.helpText}>
            Move the handles, preview the phrase, then save the loop.
          </Text>
        </View>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    color: LOOP_SELECTOR_SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: LOOP_SELECTOR_PRIMARY_TEXT,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: LOOP_SELECTOR_SECONDARY_ACTION_BACKGROUND,
  },
  closeButtonLabel: {
    color: LOOP_SELECTOR_PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  helpToggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: LOOP_SELECTOR_SECONDARY_ACTION_BACKGROUND,
  },
  helpToggleLabel: {
    color: LOOP_SELECTOR_PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  helpCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fff9f0',
  },
  helpText: {
    color: LOOP_SELECTOR_SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  buttonPressed: {
    opacity: 0.86,
  },
});