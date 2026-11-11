import type { PlayableItem } from '@org/audio-library-models';
import { midiToNoteName } from '@org/audio-library-models';
import { useRef, useState, useSyncExternalStore } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { SafeAreaFrame } from '../../../components/safe-area-frame';
import { SHELL_LAYERS } from '../../../routing/shell/shell-layers';
import { appTheme } from '../../../utils/theme';
import { PitchMonitorDock } from '../../pitch/components/pitch-monitor-dock';
import { useSungMidi } from '../../pitch/use-sung-midi';
import { RecordingDock } from '../../recording/components/recording-dock';
import { getRecordingSession } from '../../recording/recording-session-instance';
import { getCardPillLabel } from './card-pill-model';
import { clampCardOffset } from './card-position-model';
import { setCardCollapsed, setCardOffset, useCardState } from './card-store';
import { useCardDrag } from './use-card-drag';

const { colors, radius, space } = appTheme;
const CARD_WIDTH = 268;
const ICON_SIZE = 16;
/** Room kept above and below a tall card (a notice, both tools) inside the area. */
const AREA_MARGIN = 16;
const NO_SIZE = { height: 0, width: 0 };

type PracticeToolsCardProps = {
  /** The playing item and position, which the recording strip records against. */
  activePlayableItem: PlayableItem | null;
  playbackPositionSeconds: number;
};

/** The collapsed card's label: the running take's clock and the sung note. */
const usePillLabel = (): string | null => {
  const session = getRecordingSession();
  const state = useSyncExternalStore(
    session.subscribe,
    session.getState,
    session.getState,
  );
  const sungMidi = useSungMidi();

  return getCardPillLabel({
    recordingElapsedMs: state.phase === 'recording' ? state.elapsedMs : null,
    sungNote: sungMidi === null ? null : midiToNoteName(sungMidi),
  });
};

const CollapsedPill = ({ drag }: { drag: ReturnType<typeof useCardDrag> }) => {
  const label = usePillLabel();

  return (
    <Pressable
      {...drag.handlers}
      accessibilityLabel="Expand practice tools"
      accessibilityRole="button"
      onPress={() => {
        if (!drag.wasDragged.current) {
          setCardCollapsed(false);
        }
      }}
      style={styles.pill}
    >
      <Text style={styles.pillText}>{label ?? 'Practice tools'}</Text>
    </Pressable>
  );
};

/**
 * Pitch and recording over the two-column playback view in the wide-short
 * layout (follow-up F.4, option B of `mockups/f4-*.html`): one small card in
 * the lower trailing corner instead of full-width strips that squeeze the
 * sheet. Drag it by its header (it stays inside the window), collapse it to a
 * pill that stays where the card was, and expand it again. The tools stay
 * mounted while it is collapsed, so a running take and its sheets carry on.
 */
export const PracticeToolsCard = ({
  activePlayableItem,
  playbackPositionSeconds,
}: PracticeToolsCardProps) => {
  const { isCollapsed, offset } = useCardState();
  const [container, setContainer] = useState(NO_SIZE);
  const sizes = useRef({ card: NO_SIZE, container: NO_SIZE, pill: NO_SIZE });
  const drag = useCardDrag({
    card: () => (isCollapsed ? sizes.current.pill : sizes.current.card),
    container: () => sizes.current.container,
    offset,
    onMove: setCardOffset,
  });

  const measure =
    (key: 'card' | 'container' | 'pill') => (event: LayoutChangeEvent) => {
      const { height, width } = event.nativeEvent.layout;

      sizes.current[key] = { height, width };

      if (key === 'container') {
        setContainer({ height, width });
      }
    };

  // A stored offset can leave a smaller window (or a narrower area) behind.
  const shown = clampCardOffset(
    offset,
    isCollapsed ? sizes.current.pill : sizes.current.card,
    container,
  );
  const position = { bottom: shown.bottom, right: shown.right };

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <SafeAreaFrame>
        <View
          onLayout={measure('container')}
          pointerEvents="box-none"
          style={styles.area}
        >
          <View
            onLayout={measure('card')}
            style={[
              styles.card,
              position,
              container.height > 0
                ? { maxHeight: container.height - AREA_MARGIN }
                : null,
              isCollapsed ? styles.hidden : null,
            ]}
            testID="practice-tools-card"
          >
            <View style={styles.header}>
              <View
                {...drag.handlers}
                accessibilityLabel="Move practice tools"
                accessibilityRole="button"
                style={styles.handle}
              >
                <Text style={styles.kicker}>PRACTICE TOOLS</Text>
              </View>
              <Pressable
                accessibilityLabel="Collapse practice tools"
                accessibilityRole="button"
                onPress={() => {
                  setCardCollapsed(true);
                }}
                style={styles.collapse}
              >
                <AppIcon
                  color={colors.textMuted}
                  name="chevron-down"
                  size={ICON_SIZE}
                />
              </Pressable>
            </View>
            <ScrollView style={styles.body}>
              <PitchMonitorDock presentation="panel" />
              <RecordingDock
                item={activePlayableItem}
                positionSeconds={playbackPositionSeconds}
                presentation="panel"
              />
            </ScrollView>
          </View>
          {isCollapsed ? (
            <View
              onLayout={measure('pill')}
              pointerEvents="box-none"
              style={[styles.pillAnchor, position]}
            >
              <CollapsedPill drag={drag} />
            </View>
          ) : null}
        </View>
      </SafeAreaFrame>
    </View>
  );
};

const styles = StyleSheet.create({
  // Above the playback sheet, covering the shell without taking its touches.
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: SHELL_LAYERS.floatingPracticeDock,
  },
  area: { flex: 1 },
  card: {
    ...appTheme.elevation.raised,
    position: 'absolute',
    width: CARD_WIDTH,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
  },
  // Hidden, not removed, so the tools (and a running take) stay mounted.
  hidden: { display: 'none' },
  // Shrinks with the card's height cap, so a tall card scrolls inside itself.
  body: { flexShrink: 1 },
  header: { alignItems: 'center', flexDirection: 'row' },
  handle: {
    flex: 1,
    justifyContent: 'center',
    minHeight: appTheme.space.touchTarget,
    paddingHorizontal: space.md,
    // The header owns its pointers: a drag must not pan or select text.
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'grab',
  } as never,
  kicker: { ...appTheme.type.kicker, color: colors.textMuted },
  collapse: {
    alignItems: 'center',
    height: appTheme.space.touchTarget,
    justifyContent: 'center',
    width: appTheme.space.touchTarget,
  },
  pillAnchor: { position: 'absolute' },
  pill: {
    justifyContent: 'center',
    minHeight: appTheme.space.touchTarget,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    touchAction: 'none',
    userSelect: 'none',
  } as never,
  pillText: { color: colors.text, fontSize: 13 },
});
