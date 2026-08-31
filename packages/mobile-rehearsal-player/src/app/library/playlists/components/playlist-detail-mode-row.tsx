import type { RehearsalQueueMode } from '@org/audio-library-models';
import { StyleSheet, Text, View } from 'react-native';

import { CompactPlaybackAction } from '../../../components/compact-playback-action';
import {
  PLAYLIST_PRIMARY_ACTION_BACKGROUND,
  PLAYLIST_PRIMARY_ACTION_TEXT,
  PLAYLIST_PRIMARY_TEXT,
} from '../../components/saved-playlist-section-styles/shared';
import type { PlaylistDetailModeControlAction } from '../utils/saved-playlist-detail-mode-actions';

// Icon-first ordered/shuffle control row for playlist detail
// (mobile-rehearsal-player-usability: "Playlist detail fresh-start playback
// uses icon-first ordered and shuffle actions"): the active mode's icon gets
// selected styling, and each icon carries its own adjacent mode label instead
// of button copy like "Play ordered"/"Shuffle play".
export const PlaylistDetailModeRow = (props: {
  actions: PlaylistDetailModeControlAction[];
  onSelectMode: (mode: RehearsalQueueMode) => void;
}) => {
  return (
    <View style={styles.row}>
      {props.actions.map((action) => {
        return (
          <View key={action.mode} style={styles.item}>
            <CompactPlaybackAction
              accessibilityLabel={action.accessibilityLabel}
              disabled={action.disabled}
              iconColor={
                action.selected
                  ? PLAYLIST_PRIMARY_ACTION_TEXT
                  : PLAYLIST_PRIMARY_TEXT
              }
              iconName={action.icon}
              onPress={() => {
                props.onSelectMode(action.mode);
              }}
              selected={action.selected}
              style={action.selected ? styles.selectedButton : undefined}
              variant="row"
            />
            <Text
              style={[styles.label, action.selected ? styles.labelSelected : null]}
            >
              {action.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 24,
  },
  item: {
    alignItems: 'center',
    gap: 4,
  },
  selectedButton: {
    backgroundColor: PLAYLIST_PRIMARY_ACTION_BACKGROUND,
    borderColor: PLAYLIST_PRIMARY_ACTION_BACKGROUND,
  },
  label: {
    color: PLAYLIST_PRIMARY_TEXT,
    fontSize: 12,
    fontWeight: '600',
  },
  labelSelected: {
    color: PLAYLIST_PRIMARY_ACTION_BACKGROUND,
    fontWeight: '700',
  },
});
