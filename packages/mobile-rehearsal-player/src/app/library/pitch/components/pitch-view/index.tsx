import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { appTheme } from '../../../../utils/theme';
import { setPitchSensitivity, usePitch } from '../../use-pitch';
import { buildFocusTrace, resolveTarget } from '../../view/pitch-focus-model';
import {
  stepRollZoom,
  DEFAULT_ROLL_ZOOM_SECONDS,
} from '../../view/pitch-roll-model';
import type { MonitorAction } from '../../view/pitch-monitor-model';
import {
  getPitchViewLayout,
  getReadoutBar,
  getTargetChip,
  getViewReadout,
  holdFromScale,
  toggleHeld,
} from '../../view/pitch-view-model';
import { PitchFocusPanel } from './pitch-focus-panel';
import { PitchReadout } from './pitch-readout';
import { PitchReadoutBar } from './pitch-readout-bar';
import { PitchRoll } from './pitch-roll';
import { PitchSettingsSheet } from './pitch-settings-sheet';
import { useTick } from './use-tick';

type PitchViewProps = {
  isVisible: boolean;
  onClose: () => void;
};

const { colors, space } = appTheme;
const PORTRAIT_FOCUS_HEIGHT = 150;
const LANDSCAPE_FOCUS_HEIGHT = 120;
const LANDSCAPE_SIDE_WIDTH = 232;

/**
 * The full-screen Pitch view (design Decision 15): the progression roll, the
 * focus panel and a readout bar. It works with no track, never touches
 * playback, and keeps no history of its own (the store's is in memory only).
 */
export const PitchView = ({ isVisible, onClose }: PitchViewProps) => (
  <Modal animationType="slide" onRequestClose={onClose} visible={isVisible}>
    {isVisible ? <PitchViewContent onClose={onClose} /> : null}
  </Modal>
);

const PitchViewContent = ({ onClose }: { onClose: () => void }) => {
  const { state, store } = usePitch();
  const { width, height } = useWindowDimensions();
  const [heldMidi, setHeldMidi] = useState<number | null>(null);
  const [zoomSeconds, setZoomSeconds] = useState<number>(
    DEFAULT_ROLL_ZOOM_SECONDS,
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useTick(true);

  const layout = getPitchViewLayout(width, height);
  const isLandscape = layout === 'landscape';
  const history = store.history.getSnapshot();
  const target = resolveTarget(heldMidi, state.reading);
  const chip = getTargetChip(target, layout);
  const act = (action: MonitorAction) => {
    void (action === 'continue'
      ? store.confirmExplanation()
      : store.requestListen());
  };
  const readout = (
    <PitchReadout onAction={act} readout={getViewReadout(state, heldMidi)} />
  );
  const focus = (
    <View style={styles.focus}>
      <View style={styles.focusRow}>
        <Text style={styles.kicker}>Closeness</Text>
        <Pressable
          accessibilityLabel={chip.accessibilityLabel}
          accessibilityRole="button"
          onPress={() => setHeldMidi(toggleHeld(heldMidi, state))}
          style={[styles.chip, chip.isHeld ? styles.chipHeld : null]}
        >
          <Text style={styles.chipLabel}>{chip.label}</Text>
        </Pressable>
      </View>
      <PitchFocusPanel
        height={isLandscape ? LANDSCAPE_FOCUS_HEIGHT : PORTRAIT_FOCUS_HEIGHT}
        points={buildFocusTrace(history, zoomSeconds, heldMidi)}
      />
    </View>
  );
  const roll = (
    <View style={styles.roll}>
      <PitchRoll
        history={history}
        onHold={(midi) => setHeldMidi(holdFromScale(heldMidi, midi))}
        onZoom={(direction) =>
          setZoomSeconds(stepRollZoom(zoomSeconds, direction))
        }
        targetMidi={target.midi}
        windowSeconds={zoomSeconds}
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <SurfaceIconButton
          accessibilityLabel="Back to monitor"
          icon="chevron-down"
          onPress={onClose}
        />
        <Text style={styles.title}>Pitch</Text>
        <SurfaceIconButton
          accessibilityLabel="Pitch settings"
          icon="tune-variant"
          onPress={() => setIsSettingsOpen(true)}
        />
      </View>
      {isLandscape ? (
        <View style={styles.landscapeBody}>
          {roll}
          <View style={styles.side}>
            {readout}
            {focus}
          </View>
        </View>
      ) : (
        <>
          {readout}
          {focus}
          {roll}
        </>
      )}
      <PitchReadoutBar
        bar={getReadoutBar(state)}
        onToggleListening={() =>
          void (state.listening ? store.stopListening() : store.requestListen())
        }
      />
      {isSettingsOpen ? (
        <PitchSettingsSheet
          onClose={() => setIsSettingsOpen(false)}
          onSelectSensitivity={setPitchSensitivity}
          sensitivity={state.sensitivity}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.xs,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: appTheme.fontWeight.medium,
  },
  focus: { paddingHorizontal: space.md, paddingBottom: space.xs },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  kicker: { ...appTheme.type.kicker, color: colors.textFaint },
  chip: {
    minHeight: appTheme.space.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: appTheme.radius.pill,
  },
  chipHeld: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceAccent,
  },
  chipLabel: { color: colors.text, fontSize: 12 },
  roll: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
  },
  landscapeBody: { flex: 1, flexDirection: 'row', minHeight: 0 },
  side: { width: LANDSCAPE_SIDE_WIDTH },
});
