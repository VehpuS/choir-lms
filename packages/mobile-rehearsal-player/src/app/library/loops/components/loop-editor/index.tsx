import type { PlayableItem } from '@org/audio-library-models';
import { ScrollView, Text, TextInput, View } from 'react-native';

import type { CompactPlaybackActionIconName } from '../../../../components/compact-playback-action/model';
import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { FeedbackCard } from '../../../components/feedback-card';
import { ModalSurfaceBase } from '../../../components/modal-surface-base';
import { appTheme } from '../../../../utils/theme';
import {
  LOOP_EDITOR_SEEK_SECONDS,
  resolveLoopEditorSeekTarget,
} from '../../utils/loop-editor-model';
import type { LoopPreviewPlaybackTimeline } from '../../utils/saved-loop-preview-playback-view-model';
import type { LoopBuilderBoundary } from '../../utils/saved-loop-view-model';
import { LoopEditorRangeCards } from './loop-editor-range-cards';
import { LoopEditorTransport } from './loop-editor-transport';
import { LoopEditorWaveform } from './loop-editor-waveform';
import { loopEditorStyles as styles } from './styles';

type LoopEditorSurfaceProps = {
  builderIssue: { message: string; title: string } | null;
  canSaveLoop: boolean;
  canSetBoundaryFromPosition: boolean;
  endMs: number;
  eyebrowLabel: string;
  isPreparing: boolean;
  isPreviewLoading: boolean;
  isSavingLoop: boolean;
  isVisible: boolean;
  loopName: string;
  onClose: () => void;
  onLoopNameChange: (value: string) => void;
  onNudgeBoundary: (
    boundary: LoopBuilderBoundary,
    direction: 'earlier' | 'later',
  ) => void;
  onRangeChange: (sliderValue: number | number[]) => void;
  onSaveLoop: () => void;
  onScrubPreview: (positionSeconds: number) => void;
  onSetBoundaryFromPosition: (boundary: LoopBuilderBoundary) => void;
  onTogglePreview: () => void;
  previewActionLabel: string;
  previewDisabled: boolean;
  previewIconName: CompactPlaybackActionIconName;
  previewPlayableItem: PlayableItem | null;
  previewTimeline: LoopPreviewPlaybackTimeline | null;
  rangeMaximumMs: number | null;
  saveActionLabel: string;
  savingActionLabel: string;
  selectedTrack: PlayableItem | null;
  startMs: number;
};

// The loop editor (1g): opens at once and shows its loading state while the
// track's length resolves. A full-height sheet with the whole track's waveform,
// the loop as an A–B region with draggable handles, and the preview transport.
export const LoopEditorSurface = (props: LoopEditorSurfaceProps) => {
  const { selectedTrack } = props;

  if (!selectedTrack || !props.isVisible) {
    return null;
  }

  const range = { endMs: props.endMs, startMs: props.startMs };
  const seekPreviewBy = (deltaSeconds: number) => {
    if (!props.previewTimeline) {
      return;
    }

    props.onScrubPreview(
      resolveLoopEditorSeekTarget({
        deltaSeconds,
        positionSeconds: props.previewTimeline.positionSeconds,
        range,
      }),
    );
  };

  return (
    <ModalSurfaceBase
      animationType="slide"
      backdropColor={appTheme.colors.scrim}
      isVisible
      onRequestClose={props.onClose}
      placement="bottom"
      surfaceStyle={styles.sheet}
    >
      <View style={styles.grabber} />
      <View style={styles.header}>
        <Text style={styles.kicker}>{props.eyebrowLabel}</Text>
        <SurfaceIconButton
          accessibilityLabel="Close loop editor"
          icon="chevron-down"
          onPress={props.onClose}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        style={styles.body}
      >
        <Text numberOfLines={2} style={styles.title}>
          {selectedTrack.source.name}
        </Text>

        <LoopEditorWaveform
          isLoading={props.isPreparing}
          onNudgeBoundary={props.onNudgeBoundary}
          onRangeChange={props.onRangeChange}
          playbackPositionSeconds={props.previewTimeline?.positionSeconds ?? 0}
          range={range}
          selectedTrack={selectedTrack}
          trackDurationMs={props.rangeMaximumMs}
        />

        <LoopEditorRangeCards
          isLoading={props.isPreparing}
          onNudgeBoundary={props.onNudgeBoundary}
          range={range}
          trackDurationMs={props.rangeMaximumMs}
        />

        <LoopEditorTransport
          canSeek={props.previewTimeline?.canScrub ?? false}
          canSetBoundaryFromPosition={props.canSetBoundaryFromPosition}
          isPreviewLoading={props.isPreviewLoading}
          onSeekBackward={() => {
            seekPreviewBy(-LOOP_EDITOR_SEEK_SECONDS);
          }}
          onSeekForward={() => {
            seekPreviewBy(LOOP_EDITOR_SEEK_SECONDS);
          }}
          onSetBoundaryFromPosition={props.onSetBoundaryFromPosition}
          onTogglePreview={props.onTogglePreview}
          previewActionLabel={props.previewActionLabel}
          previewDisabled={props.previewDisabled || props.isPreparing}
          previewIconName={props.previewIconName}
        />

        <TextInput
          accessibilityLabel="Loop name"
          autoCorrect={false}
          onChangeText={props.onLoopNameChange}
          placeholder="Name this practice loop"
          placeholderTextColor={appTheme.colors.textFaint}
          returnKeyType="done"
          style={styles.nameInput}
          value={props.loopName}
        />

        {props.builderIssue && !props.isPreparing ? (
          <FeedbackCard
            message={props.builderIssue.message}
            title={props.builderIssue.title}
            tone="error"
          />
        ) : null}

        <OutlinedActionButton
          accessibilityLabel={props.saveActionLabel}
          disabled={!props.canSaveLoop}
          fill
          isBusy={props.isSavingLoop}
          label={
            props.isSavingLoop ? props.savingActionLabel : props.saveActionLabel
          }
          onPress={props.onSaveLoop}
          variant="accent"
        />
      </ScrollView>
    </ModalSurfaceBase>
  );
};
