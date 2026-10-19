import type { PlayableItem } from '@org/audio-library-models';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { darkScrollbarStyle } from '../../../../components/dark-scrollbar';
import { appTheme } from '../../../../utils/theme';
import { useLyricsFor } from '../../../components/saved-item-menu/saved-item-availability-context';
import { requestSavedItemAction } from '../../../components/saved-item-menu/saved-item-requests';
import {
  resolveLyricsTextStyle,
  useLyricsTextSize,
} from '../../lyrics-text-size';
import { requestLyricsView } from '../../lyrics-view-request';
import {
  LYRICS_PREVIEW_LINES,
  resolveLyricsSectionModel,
  shouldShowInlineLyrics,
} from './model';

type LyricsSectionProps = {
  item: Pick<PlayableItem, 'kind' | 'loopId' | 'sourceId'>;
};

/**
 * The playback screen's Lyrics section: a fixed-height scrollable window on tall screens (only `View` on short ones)
 * and `Edit`, or, with no lyrics yet, just an `Add lyrics` button (no title or
 * prose, so a track without lyrics takes only a button's height). With lyrics
 * its height depends only on the text size, so changing between two items
 * that have them does not move what is below.
 */
export const LyricsSection = ({ item }: LyricsSectionProps) => {
  const resolution = useLyricsFor(item);
  const textSize = useLyricsTextSize();
  const showsInlineText = shouldShowInlineLyrics(useWindowDimensions().height);
  const model = resolveLyricsSectionModel(item, resolution);

  if (model.kind === 'hidden') {
    return null;
  }

  const textStyle = resolveLyricsTextStyle(textSize);
  const previewHeight = textStyle.lineHeight * LYRICS_PREVIEW_LINES;
  const editLyrics = () => {
    requestSavedItemAction({
      action: 'edit-lyrics',
      id: item.sourceId,
      kind: 'track',
    });
  };

  return (
    <View style={styles.section}>
      {model.kind === 'filled' ? (
        <View style={styles.header}>
          <Text style={styles.kicker}>Lyrics</Text>
          <View style={styles.actions}>
            <OutlinedActionButton label="Edit" onPress={editLyrics} />
            <OutlinedActionButton
              label="View"
              onPress={() => {
                requestLyricsView({ mode: 'reading', sourceId: item.sourceId });
              }}
            />
          </View>
        </View>
      ) : null}
      {model.kind === 'filled' ? (
        <>
          {model.sharedFromName ? (
            <Text numberOfLines={1} style={styles.note}>
              {`Lyrics for ${model.sharedFromName}`}
            </Text>
          ) : null}
          {/* A fixed-height window onto the full text, so it scrolls in place. */}
          {showsInlineText ? (
            <ScrollView
              nestedScrollEnabled
              style={[darkScrollbarStyle, { height: previewHeight }]}
            >
              <Text selectable style={textStyle}>
                {model.text}
              </Text>
            </ScrollView>
          ) : null}
        </>
      ) : (
        <View style={styles.empty}>
          <OutlinedActionButton
            icon="plus"
            label="Add lyrics"
            onPress={editLyrics}
            variant="accent"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  empty: {
    alignItems: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appTheme.space.md,
  },
  kicker: {
    ...appTheme.type.kicker,
    color: appTheme.colors.textMuted,
  },
  note: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
  },
  section: {
    gap: appTheme.space.sm,
  },
});
