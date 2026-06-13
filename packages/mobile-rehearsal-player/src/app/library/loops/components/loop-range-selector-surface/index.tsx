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

import type { LoopPreviewPlaybackTimeline } from '../../utils/saved-loop-preview-playback-view-model';
import {
  LOOP_SELECTOR_BACKDROP,
  LOOP_SELECTOR_CARD_BACKGROUND,
  LOOP_SELECTOR_ERROR_SURFACE,
  LOOP_SELECTOR_ERROR_TEXT,
  LOOP_SELECTOR_INPUT_BACKGROUND,
  LOOP_SELECTOR_PLACEHOLDER_TEXT,
  LOOP_SELECTOR_PRIMARY_ACTION_BACKGROUND,
  LOOP_SELECTOR_PRIMARY_ACTION_TEXT,
  LOOP_SELECTOR_PRIMARY_TEXT,
  LOOP_SELECTOR_SECONDARY_ACTION_BACKGROUND,
} from './shared';
import { LoopRangeSelectorHeader } from './loop-range-selector-header';
import { LoopRangeSelectorPreviewCard } from './loop-range-selector-preview-card';
import { LoopRangeSelectorRangeCard } from './loop-range-selector-range-card';

type LoopRangeSelectorSurfaceProps = {
  builderIssue: {
    title: string;
    message: string;
  } | null;
  canSaveLoop: boolean;
  endMs: number;
  eyebrowLabel: string;
  isSavingLoop: boolean;
  isVisible: boolean;
  loopName: string;
  onClose: () => void;
  onLoopNameChange: (value: string) => void;
  onRangeChange: (sliderValue: number | number[]) => void;
  onSaveLoop: () => void;
  onScrubPreview: (positionSeconds: number) => void;
  onTogglePreview: () => void;
  previewActionLabel: string;
  previewDisabled: boolean;
  previewPlayableItem: PlayableItem | null;
  previewTimeline: LoopPreviewPlaybackTimeline | null;
  rangeMaximumMs: number | null;
  saveActionLabel: string;
  selectedTrack: PlayableItem | null;
  savingActionLabel: string;
  startMs: number;
};

export const LoopRangeSelectorSurface = ({
  builderIssue,
  canSaveLoop,
  endMs,
  eyebrowLabel,
  isSavingLoop,
  isVisible,
  loopName,
  onClose,
  onLoopNameChange,
  onRangeChange,
  onSaveLoop,
  onScrubPreview,
  onTogglePreview,
  previewActionLabel,
  previewDisabled,
  previewPlayableItem,
  previewTimeline,
  rangeMaximumMs,
  saveActionLabel,
  selectedTrack,
  savingActionLabel,
  startMs,
}: LoopRangeSelectorSurfaceProps) => {
  const [isTipsVisible, setIsTipsVisible] = useState(false);

  if (!selectedTrack || !isVisible) {
    return null;
  }

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
          <LoopRangeSelectorHeader
            eyebrowLabel={eyebrowLabel}
            isTipsVisible={isTipsVisible}
            onClose={onClose}
            onToggleTips={() => {
              setIsTipsVisible((currentValue) => !currentValue);
            }}
            title={selectedTrack.source.name}
          />

          <LoopRangeSelectorRangeCard
            endMs={endMs}
            onRangeChange={onRangeChange}
            rangeMaximumMs={rangeMaximumMs}
            selectedTrack={selectedTrack}
            startMs={startMs}
          />

          {previewPlayableItem && previewTimeline ? (
            <LoopRangeSelectorPreviewCard
              onScrubPreview={onScrubPreview}
              previewPlayableItem={previewPlayableItem}
              previewTimeline={previewTimeline}
            />
          ) : null}

          <TextInput
            autoCorrect={false}
            onChangeText={onLoopNameChange}
            placeholder="Name this practice loop"
            placeholderTextColor={LOOP_SELECTOR_PLACEHOLDER_TEXT}
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
                {isSavingLoop ? savingActionLabel : saveActionLabel}
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
    backgroundColor: LOOP_SELECTOR_BACKDROP,
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
    backgroundColor: LOOP_SELECTOR_CARD_BACKGROUND,
  },
  nameInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 14,
    backgroundColor: LOOP_SELECTOR_INPUT_BACKGROUND,
    color: LOOP_SELECTOR_PRIMARY_TEXT,
    fontSize: 15,
  },
  issueCard: {
    gap: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: LOOP_SELECTOR_ERROR_SURFACE,
  },
  issueTitle: {
    color: LOOP_SELECTOR_ERROR_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  issueMessage: {
    color: LOOP_SELECTOR_ERROR_TEXT,
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
    backgroundColor: LOOP_SELECTOR_SECONDARY_ACTION_BACKGROUND,
  },
  secondaryActionLabel: {
    color: LOOP_SELECTOR_PRIMARY_TEXT,
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
    backgroundColor: LOOP_SELECTOR_PRIMARY_ACTION_BACKGROUND,
  },
  primaryActionLabel: {
    color: LOOP_SELECTOR_PRIMARY_ACTION_TEXT,
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