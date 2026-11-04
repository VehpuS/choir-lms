import type { PlayableItem } from '@org/audio-library-models';
import {
  applyActiveLoop,
  applyCurrentPosition,
  createPunchDraft,
  nudgePunchPoint,
  LARGE_NUDGE_MS,
  setPunchPoint,
  stepPreRoll,
  toPunchRange,
  type PunchDraft,
  type PunchLoop,
  type PunchPoint,
  type PunchRange,
} from '@org/audio-mixing';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import type { WaveformMarker } from '../../../components/playback-waveform/marker-flags-model';
import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  PUNCH_SHEET_COPY,
  applyFlagTap,
  applyHandleDrag,
  applyTypedTime,
  getPunchSheetModel,
} from './punch-sheet-model';
import { PointRow, StepButton } from './punch-sheet-controls';
import { PunchWaveform } from './punch-waveform';

const { colors, space, type } = appTheme;
const MS_PER_SECOND = 1000;
/** A fresh range starts at the playhead and runs this long, until the user adjusts it. */
const STARTING_RANGE_MS = 10_000;
const PRE_ROLL_WIDTH = 36;

type PunchSheetProps = {
  item: PlayableItem;
  durationMs: number;
  markers: readonly WaveformMarker[];
  /** The loop playing now, for `Use active loop`; absent when no loop is active. */
  activeLoop?: PunchLoop;
  positionMs: number;
  onArm: (range: PunchRange) => void;
  onClose: () => void;
};

const startingDraft = (positionMs: number, durationMs: number): PunchDraft => {
  const start = Math.min(positionMs, Math.max(0, durationMs - MS_PER_SECOND));

  return setPunchPoint(
    setPunchPoint(createPunchDraft(), 'in', start, durationMs),
    'out',
    Math.min(durationMs, start + STARTING_RANGE_MS),
    durationMs,
  );
};

/**
 * The punch-range setup sheet from the approved mock (rehearsal-recording
 * design Decision 18). It owns the draft and shows what `punch-sheet-model`
 * works out; `Arm` hands the validated range to the host.
 */
export const PunchSheet = ({
  activeLoop,
  durationMs,
  item,
  markers,
  onArm,
  onClose,
  positionMs,
}: PunchSheetProps) => {
  const [draft, setDraft] = useState(() =>
    startingDraft(positionMs, durationMs),
  );
  const [nextFlagPoint, setNextFlagPoint] = useState<PunchPoint>('in');
  const model = getPunchSheetModel({
    draft,
    markers,
    trackDurationMs: durationMs,
  });
  const nudge = (point: PunchPoint, deltaMs: number) =>
    setDraft((current) => nudgePunchPoint(current, point, deltaMs, durationMs));
  const arm = () => {
    const range = toPunchRange(draft, durationMs);

    if (range) {
      onArm(range);
    }
  };

  return (
    <BottomSheetSurface
      footer={
        <View style={styles.actions}>
          <OutlinedActionButton
            label={PUNCH_SHEET_COPY.cancelLabel}
            onPress={onClose}
          />
          <OutlinedActionButton
            disabled={!model.canArm}
            label={PUNCH_SHEET_COPY.armLabel}
            onPress={arm}
          />
        </View>
      }
      isVisible
      onClose={onClose}
      scrollable
      title={PUNCH_SHEET_COPY.title}
    >
      <View style={styles.body}>
        <Text style={styles.hint}>{PUNCH_SHEET_COPY.subtitle}</Text>
        <PunchWaveform
          durationMs={durationMs}
          inRatio={model.inView.ratio}
          item={item}
          markers={markers}
          onDragPoint={(point, ratio, widthPx) =>
            setDraft((current) =>
              applyHandleDrag({
                draft: current,
                loop: activeLoop,
                markers,
                point,
                ratio,
                trackDurationMs: durationMs,
                widthPx,
              }),
            )
          }
          onFlagPress={(flag) => {
            const tapped = applyFlagTap(
              draft,
              flag.positionMs,
              nextFlagPoint,
              durationMs,
            );

            setDraft(tapped.draft);
            setNextFlagPoint(tapped.next);
          }}
          onNudgePoint={(point, direction) =>
            nudge(point, direction * LARGE_NUDGE_MS)
          }
          outRatio={model.outView.ratio}
          playheadRatio={durationMs > 0 ? positionMs / durationMs : 0}
        />
        <PointRow
          label="In"
          onNudge={(delta) => nudge('in', delta)}
          onType={(text) =>
            setDraft((current) =>
              applyTypedTime(current, 'in', text, durationMs),
            )
          }
          view={model.inView}
        />
        <PointRow
          label="Out"
          onNudge={(delta) => nudge('out', delta)}
          onType={(text) =>
            setDraft((current) =>
              applyTypedTime(current, 'out', text, durationMs),
            )
          }
          view={model.outView}
        />
        <View style={styles.links}>
          {activeLoop ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setDraft((current) => applyActiveLoop(current, activeLoop))
              }
            >
              <Text style={styles.link}>{PUNCH_SHEET_COPY.useLoopLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setDraft((current) =>
                applyCurrentPosition(current, positionMs, durationMs),
              )
            }
          >
            <Text style={styles.link}>{PUNCH_SHEET_COPY.usePositionLabel}</Text>
          </Pressable>
        </View>
        <View style={styles.preRollRow}>
          <Text style={styles.pointKey}>{PUNCH_SHEET_COPY.preRollLabel}</Text>
          <StepButton
            accessibilityLabel="Shorter pre-roll"
            label="−"
            onPress={() => setDraft((current) => stepPreRoll(current, -1))}
          />
          <Text style={styles.preRollValue}>{model.preRollText}</Text>
          <StepButton
            accessibilityLabel="Longer pre-roll"
            label="+"
            onPress={() => setDraft((current) => stepPreRoll(current, 1))}
          />
        </View>
        <View style={styles.keepRow}>
          <Text style={styles.keepLabel}>
            {PUNCH_SHEET_COPY.keepPlayingLabel}
          </Text>
          <Switch
            accessibilityLabel={PUNCH_SHEET_COPY.keepPlayingLabel}
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                keepPlayingAfterOut: value,
              }))
            }
            value={draft.keepPlayingAfterOut}
          />
        </View>
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.hint, model.note.isProblem ? styles.problem : null]}
        >
          {model.note.text}
        </Text>
      </View>
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: space.sm, justifyContent: 'flex-end' },
  body: { gap: space.sm },
  hint: { ...type.rowMeta, color: colors.textMuted },
  keepLabel: { ...type.rowMeta, color: colors.text },
  keepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  link: { ...type.rowMeta, color: colors.accentText },
  links: { flexDirection: 'row', gap: space.lg },
  pointKey: { ...type.sectionHead, color: colors.textMuted },
  preRollRow: { alignItems: 'center', flexDirection: 'row', gap: space.sm },
  preRollValue: {
    ...type.rowMeta,
    color: colors.text,
    minWidth: PRE_ROLL_WIDTH,
    textAlign: 'center',
  },
  problem: { color: colors.warning },
});
