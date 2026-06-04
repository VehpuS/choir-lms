import { Slider } from '@miblanchard/react-native-slider';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../utils/theme';

import {
  clampQueuePosition,
  resolveQueueMoveTargetIndex,
} from './queue-move-position-model';

type QueueMovePositionDialogProps = {
  currentIndex: number;
  isVisible: boolean;
  itemCount: number;
  itemTitle: string;
  onCancel: () => void;
  onSubmit: (targetIndex: number) => void;
};

export const QueueMovePositionDialog = ({
  currentIndex,
  isVisible,
  itemCount,
  itemTitle,
  onCancel,
  onSubmit,
}: QueueMovePositionDialogProps) => {
  const [draftPosition, setDraftPosition] = useState(
    clampQueuePosition(currentIndex + 1, itemCount),
  );

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    setDraftPosition(clampQueuePosition(currentIndex + 1, itemCount));
  }, [currentIndex, isVisible, itemCount]);

  if (!isVisible || itemCount < 1) {
    return null;
  }

  const currentPosition = clampQueuePosition(currentIndex + 1, itemCount);
  const targetIndex = resolveQueueMoveTargetIndex({
    itemCount,
    sliderValue: draftPosition,
  });
  const targetPosition = targetIndex + 1;
  const isSubmittingDisabled = targetPosition === currentPosition;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={isVisible}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Move to position</Text>
          <Text style={styles.body}>
            Choose a new queue position for {itemTitle}. Playback continues
            while Up Next updates.
          </Text>

          <View style={styles.positionSummaryRow}>
            <View style={styles.positionChip}>
              <Text style={styles.positionChipLabel}>Current</Text>
              <Text style={styles.positionChipValue}>
                {currentPosition} of {itemCount}
              </Text>
            </View>
            <View style={styles.positionChip}>
              <Text style={styles.positionChipLabel}>Move to</Text>
              <Text style={styles.positionChipValue}>
                {targetPosition} of {itemCount}
              </Text>
            </View>
          </View>

          <Slider
            animateTransitions={false}
            maximumTrackTintColor="#d5ddd7"
            maximumValue={itemCount}
            minimumTrackTintColor="#305c4d"
            minimumValue={1}
            onSlidingComplete={(nextValue) => {
              setDraftPosition(
                resolveQueueMoveTargetIndex({
                  itemCount,
                  sliderValue: nextValue,
                }) + 1,
              );
            }}
            onValueChange={(nextValue) => {
              setDraftPosition(
                resolveQueueMoveTargetIndex({
                  itemCount,
                  sliderValue: nextValue,
                }) + 1,
              );
            }}
            step={1}
            thumbTintColor="#305c4d"
            thumbTouchSize={{ width: 36, height: 36 }}
            trackClickable
            value={draftPosition}
          />

          <View style={styles.scaleRow}>
            <Text style={styles.scaleLabel}>1</Text>
            <Text style={styles.scaleLabel}>{itemCount}</Text>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.buttonPressed : undefined,
              ]}
            >
              <Text style={styles.secondaryButtonLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmittingDisabled}
              onPress={() => {
                onSubmit(targetIndex);
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !isSubmittingDisabled
                  ? styles.buttonPressed
                  : undefined,
                isSubmittingDisabled ? styles.buttonDisabled : undefined,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>Move item</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  body: {
    color: appTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.84,
  },
  card: {
    gap: 12,
    width: '92%',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fffdf8',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(31, 28, 23, 0.35)',
  },
  positionChip: {
    flex: 1,
    gap: 2,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#faf6ee',
  },
  positionChipLabel: {
    color: appTheme.colors.secondaryText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  positionChipValue: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
  positionSummaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#305c4d',
  },
  primaryButtonLabel: {
    color: '#fff8ef',
    fontSize: 14,
    fontWeight: '700',
  },
  scaleLabel: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '700',
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#fffdf8',
  },
  secondaryButtonLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    color: appTheme.colors.primaryText,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
});
