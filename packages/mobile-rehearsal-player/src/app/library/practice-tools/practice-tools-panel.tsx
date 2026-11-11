import type { PlayableItem } from '@org/audio-library-models';
import { ScrollView, StyleSheet, View } from 'react-native';

import { paneBleedStyle } from '../../routing/shell/dock-bleed';
import { SHELL_LAYERS } from '../../routing/shell/shell-layers';
import { appTheme } from '../../utils/theme';
import { PitchMonitorDock } from '../pitch/components/pitch-monitor-dock';
import { RecordingDock } from '../recording/components/recording-dock';

const { colors } = appTheme;

type PracticeToolsPanelProps = {
  /** The playing item and position, which the recording strip records against. */
  activePlayableItem: PlayableItem | null;
  playbackPositionSeconds: number;
};

/**
 * The wide-short layout's trailing panel for the pitch monitor and the
 * recording strip. It takes the Now Playing pane's place while either is on
 * (the shell chooses), so neither strip reduces the content's height. The
 * piano is not here: it keeps a full-width keyboard at the bottom.
 */
export const PracticeToolsPanel = ({
  activePlayableItem,
  playbackPositionSeconds,
}: PracticeToolsPanelProps) => (
  <View style={[styles.panel, paneBleedStyle]} testID="practice-tools-panel">
    <ScrollView>
      <PitchMonitorDock presentation="panel" />
      <RecordingDock
        item={activePlayableItem}
        positionSeconds={playbackPositionSeconds}
        presentation="panel"
      />
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  panel: {
    zIndex: SHELL_LAYERS.bottomDock,
    borderLeftWidth: 1,
    borderLeftColor: colors.borderSubtle,
    backgroundColor: colors.surfaceRaised,
  },
});
