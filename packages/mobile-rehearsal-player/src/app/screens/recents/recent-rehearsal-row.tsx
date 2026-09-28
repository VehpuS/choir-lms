import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { CompactPlaybackAction } from '../../components/compact-playback-action';
import { EqualizerMark } from '../../components/equalizer-mark';
import { OverflowMenuTrigger } from '../../components/overflow-menu-trigger';
import { appTheme } from '../../utils/theme';
import type { RecentRehearsalItem } from './history';
import { getRecentRowMeta, getRecentRowPresentation } from './row-model';

type RecentRehearsalRowProps = {
  isLast: boolean;
  isPlaying: boolean;
  onOpenOptions: () => void;
  onPlay: () => void;
  recentRehearsal: RecentRehearsalItem;
};

const { colors } = appTheme;
const TILE_SIZE = 34;
const TILE_ICON_SIZE = 18;

// Row anatomy from screen 1a: kind tile, title over a muted meta line, then
// a play ring (or the equalizer mark while playing) and the overflow trigger.
export const RecentRehearsalRow = ({
  isLast,
  isPlaying,
  onOpenOptions,
  onPlay,
  recentRehearsal,
}: RecentRehearsalRowProps) => {
  const presentation = getRecentRowPresentation({
    isPlaying,
    kind: recentRehearsal.kind,
  });
  const isTileActive = presentation.tileTone === 'active';

  return (
    <View style={[styles.row, isLast ? null : styles.rowSeparated]}>
      <View style={[styles.tile, isTileActive ? styles.tileActive : null]}>
        <AppIcon
          color={isTileActive ? colors.accentText : colors.icon}
          name={presentation.iconName}
          size={TILE_ICON_SIZE}
        />
      </View>
      <View style={styles.copy}>
        <Text
          numberOfLines={1}
          style={[styles.title, isPlaying ? styles.titlePlaying : null]}
        >
          {recentRehearsal.title}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {getRecentRowMeta({ isPlaying, recentRehearsal })}
        </Text>
      </View>
      {isPlaying ? (
        <EqualizerMark />
      ) : (
        <CompactPlaybackAction
          accessibilityLabel={`Play ${recentRehearsal.title}`}
          iconName="play"
          onPress={onPlay}
          variant="row"
        />
      )}
      <OverflowMenuTrigger
        accessibilityLabel={`More actions for ${recentRehearsal.title}`}
        onPress={onOpenOptions}
        style={styles.overflowTrigger}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  rowSeparated: {
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderTile,
    borderRadius: appTheme.radius.md,
  },
  tileActive: {
    borderColor: colors.transparent,
    backgroundColor: colors.surfaceAccent,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    ...appTheme.type.rowTitle,
    color: colors.text,
  },
  titlePlaying: {
    color: colors.accentText,
  },
  meta: {
    ...appTheme.type.rowMeta,
    fontVariant: [...appTheme.tabularNumbers],
  },
  // Inline in the row rather than pinned to a card's top-right corner.
  overflowTrigger: {
    position: 'relative',
    top: 0,
    right: 0,
  },
});
