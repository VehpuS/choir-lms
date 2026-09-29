import type { RehearsalQueueMode } from '@org/audio-library-models';
import { StyleSheet, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import type { PlaylistDetailModeControlAction } from '../utils/saved-playlist-detail-mode-actions';

// Icon-first ordered/shuffle control row for playlist detail
// (mobile-rehearsal-player-usability: "Playlist detail fresh-start playback
// uses icon-first ordered and shuffle actions"), drawn as screen 1c's
// half-width Play all / Shuffle pair. Each action keeps its visible mode label
// instead of button copy like "Play ordered"/"Shuffle play"; the running mode
// carries the accent outline and `selected` state, so it is not conveyed by
// color alone.
export const PlaylistDetailModeRow = (props: {
  actions: PlaylistDetailModeControlAction[];
  onSelectMode: (mode: RehearsalQueueMode) => void;
}) => {
  return (
    <View style={styles.row}>
      {props.actions.map((action) => {
        return (
          <OutlinedActionButton
            accessibilityLabel={action.accessibilityLabel}
            disabled={action.disabled}
            fill
            icon={action.icon}
            key={action.mode}
            label={action.label}
            onPress={() => {
              props.onSelectMode(action.mode);
            }}
            selected={action.selected}
            variant={action.variant}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: appTheme.space.sm,
  },
});
