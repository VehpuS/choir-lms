import type { ReactNode } from 'react';
import { Modal, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { SafeAreaScreen } from '../../../../components/safe-area-frame';
import { useAutoHidingBar } from '../../use-auto-hiding-bar';
import {
  PianoPlayingChipView,
  type PianoPlayingChip,
} from './piano-playing-chip';

type PianoFullScreenFrameProps = {
  /** The bar, told whether its controls show (auto-hide may have hidden them). */
  bar: (isContentShown: boolean) => ReactNode;
  children: ReactNode;
  isAutoHideOn: boolean;
  onExit: () => void;
  /** The height the keys may fill, once the window is measured. */
  onHeightChange: (height: number) => void;
  playingChip: PianoPlayingChip | null;
};

/**
 * Full screen: the piano in its own Modal over the whole shell (rail, pane and
 * content step aside; playback is untouched), inside the safe areas. Any
 * touch wakes an auto-hidden bar. Back or Escape exits full screen.
 */
export const PianoFullScreenFrame = ({
  bar,
  children,
  isAutoHideOn,
  onExit,
  onHeightChange,
  playingChip,
}: PianoFullScreenFrameProps) => {
  const { isShown, wake } = useAutoHidingBar(isAutoHideOn);
  const handleLayout = (event: LayoutChangeEvent) => {
    onHeightChange(event.nativeEvent.layout.height);
  };
  // The keys claim their own pointers; the touch still bubbles to this wrapper.
  const webProps = { onPointerDown: wake };

  return (
    <Modal animationType="none" onRequestClose={onExit} visible>
      <SafeAreaScreen>
        <View
          {...webProps}
          onLayout={handleLayout}
          style={styles.frame}
          testID="piano-overlay"
        >
          {bar(isShown)}
          {children}
          {playingChip ? <PianoPlayingChipView chip={playingChip} /> : null}
        </View>
      </SafeAreaScreen>
    </Modal>
  );
};

const styles = StyleSheet.create({
  frame: { flex: 1 },
});
