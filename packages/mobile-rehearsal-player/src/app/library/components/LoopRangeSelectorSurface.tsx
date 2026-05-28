import { Slider } from '@miblanchard/react-native-slider';
import { type PlayableItem } from '@org/audio-library-models';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { formatDurationLabel } from '../utils/drive-library-view-model';

type LoopRangeSelectorSurfaceProps = {
  builderIssue: {
    title: string;
    message: string;
  } | null;
  canSaveLoop: boolean;
  endMs: number;
  isSavingLoop: boolean;
  isVisible: boolean;
  loopName: string;
  onClose: () => void;
  onLoopNameChange: (value: string) => void;
  onRangeChange: (sliderValue: number | number[]) => void;
  onSaveLoop: () => void;
  onTogglePreview: () => void;
  previewActionLabel: string;
  previewDisabled: boolean;
  rangeMaximumMs: number | null;
  selectedTrack: PlayableItem | null;
  startMs: number;
};

const BACKDROP = 'rgba(20, 18, 13, 0.42)';
const CARD_BACKGROUND = '#fffdf8';
const ERROR_SURFACE = '#fff1ed';
const ERROR_TEXT = '#8a2d1f';
const INPUT_BACKGROUND = '#fff9f0';
const PLACEHOLDER_TEXT = '#857b6c';
const PRIMARY_ACTION_BACKGROUND = '#305c4d';
const PRIMARY_ACTION_TEXT = '#fff8ef';
const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_ACTION_BACKGROUND = '#f2ece1';
const SECONDARY_TEXT = '#5f5647';

const formatRangeLabel = (value: number) => {
  return formatDurationLabel(value) ?? '0:00';
};

export const LoopRangeSelectorSurface = ({
  builderIssue,
  canSaveLoop,
  endMs,
  isSavingLoop,
  isVisible,
  loopName,
  onClose,
  onLoopNameChange,
  onRangeChange,
  onSaveLoop,
  onTogglePreview,
  previewActionLabel,
  previewDisabled,
  rangeMaximumMs,
  selectedTrack,
  startMs,
}: LoopRangeSelectorSurfaceProps) => {
  const [isTipsVisible, setIsTipsVisible] = useState(false);

  if (!selectedTrack || !isVisible) {
    return null;
  }

  const rangeDurationMs = Math.max(0, endMs - startMs);
  const maximumValueSeconds = Math.max(
    selectedTrack.range.startMs / 1000,
    (rangeMaximumMs ?? selectedTrack.range.startMs) / 1000,
  );

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={isVisible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>New loop</Text>
              <Text style={styles.title}>{selectedTrack.source.name}</Text>
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
            onPress={() => {
              setIsTipsVisible((currentValue) => !currentValue);
            }}
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

          <View style={styles.rangeCard}>
            <View style={styles.rangeSummaryRow}>
              <View style={styles.rangeChip}>
                <Text style={styles.rangeChipLabel}>Start</Text>
                <Text style={styles.rangeChipValue}>
                  {formatRangeLabel(startMs)}
                </Text>
              </View>
              <View style={styles.rangeChip}>
                <Text style={styles.rangeChipLabel}>End</Text>
                <Text style={styles.rangeChipValue}>
                  {formatRangeLabel(endMs)}
                </Text>
              </View>
              <View style={styles.rangeChip}>
                <Text style={styles.rangeChipLabel}>Length</Text>
                <Text style={styles.rangeChipValue}>
                  {formatRangeLabel(rangeDurationMs)}
                </Text>
              </View>
            </View>

            <Slider
              animateTransitions={false}
              maximumTrackTintColor="#d5ddd7"
              maximumValue={maximumValueSeconds}
              minimumTrackTintColor="#305c4d"
              minimumValue={selectedTrack.range.startMs / 1000}
              onSlidingComplete={onRangeChange}
              onValueChange={onRangeChange}
              step={1}
              thumbTintColor="#305c4d"
              thumbTouchSize={{ width: 36, height: 36 }}
              trackClickable
              value={[startMs / 1000, endMs / 1000]}
            />

            <View style={styles.scaleRow}>
              <Text style={styles.scaleLabel}>
                {formatRangeLabel(selectedTrack.range.startMs)}
              </Text>
              <Text style={styles.scaleLabel}>
                {formatRangeLabel(rangeMaximumMs ?? selectedTrack.range.startMs)}
              </Text>
            </View>
          </View>

          <TextInput
            autoCorrect={false}
            onChangeText={onLoopNameChange}
            placeholder="Name this practice loop"
            placeholderTextColor={PLACEHOLDER_TEXT}
            returnKeyType="done"
            style={styles.nameInput}
            value={loopName}
          />

          {builderIssue ? (
            <View style={styles.issueCard}>
              <Text style={styles.issueTitle}>{builderIssue.title}</Text>
              <Text style={styles.issueMessage}>{builderIssue.message}</Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={previewDisabled}
              onPress={onTogglePreview}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed && !previewDisabled ? styles.buttonPressed : undefined,
                previewDisabled ? styles.buttonDisabled : undefined,
              ]}
            >
              <Text style={styles.secondaryActionLabel}>
                {previewActionLabel}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={!canSaveLoop}
              onPress={onSaveLoop}
              style={({ pressed }) => [
                styles.primaryAction,
                pressed && canSaveLoop ? styles.buttonPressed : undefined,
                !canSaveLoop ? styles.buttonDisabled : undefined,
              ]}
            >
              <Text style={styles.primaryActionLabel}>
                {isSavingLoop ? 'Saving loop…' : 'Save loop'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: BACKDROP,
  },
  backdrop: {
    flex: 1,
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
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: PRIMARY_TEXT,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: SECONDARY_ACTION_BACKGROUND,
  },
  closeButtonLabel: {
    color: PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  helpToggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: SECONDARY_ACTION_BACKGROUND,
  },
  helpToggleLabel: {
    color: PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  helpCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: INPUT_BACKGROUND,
  },
  helpText: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  rangeCard: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 18,
    backgroundColor: '#fffaf2',
  },
  rangeSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rangeChip: {
    gap: 4,
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f4eee2',
  },
  rangeChipLabel: {
    color: SECONDARY_TEXT,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  rangeChipValue: {
    color: PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  scaleLabel: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '600',
  },
  nameInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 14,
    backgroundColor: INPUT_BACKGROUND,
    color: PRIMARY_TEXT,
    fontSize: 15,
  },
  issueCard: {
    gap: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: ERROR_SURFACE,
  },
  issueTitle: {
    color: ERROR_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  issueMessage: {
    color: ERROR_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  secondaryAction: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: SECONDARY_ACTION_BACKGROUND,
  },
  secondaryActionLabel: {
    color: PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryAction: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: PRIMARY_ACTION_BACKGROUND,
  },
  primaryActionLabel: {
    color: PRIMARY_ACTION_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});