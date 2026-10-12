import type { PlayableItem } from '@org/audio-library-models';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { appTheme } from '../../../../utils/theme';
import { useLyricsFor } from '../../../components/saved-item-menu/saved-item-availability-context';
import { requestSavedItemAction } from '../../../components/saved-item-menu/saved-item-requests';
import {
  resolveLyricsTextStyle,
  useLyricsTextSize,
} from '../../lyrics-text-size';
import { requestLyricsView } from '../../lyrics-view-request';
import { LYRICS_PREVIEW_LINES, resolveLyricsSectionModel } from './model';

type LyricsSectionProps = {
  item: Pick<PlayableItem, 'kind' | 'loopId' | 'sourceId'>;
};

const ADD_LYRICS_PROMPT = 'Add the words to read them while you sing.';

/**
 * The playback screen's Lyrics section: a fixed-height scrollable window with `Show all`
 * and `Edit`, or an `Add lyrics` prompt. Its height depends only on the text
 * size, so changing the playing item does not move what is below it.
 */
export const LyricsSection = ({ item }: LyricsSectionProps) => {
  const resolution = useLyricsFor(item);
  const textSize = useLyricsTextSize();
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
      <View style={styles.header}>
        <Text style={styles.kicker}>Lyrics</Text>
        {model.kind === 'filled' ? (
          <View style={styles.actions}>
            <OutlinedActionButton label="Edit" onPress={editLyrics} />
            <OutlinedActionButton
              label="Show all"
              onPress={() => {
                requestLyricsView({ mode: 'reading', sourceId: item.sourceId });
              }}
            />
          </View>
        ) : null}
      </View>
      {model.kind === 'filled' ? (
        <>
          {model.sharedFromName ? (
            <Text numberOfLines={1} style={styles.note}>
              {`Lyrics for ${model.sharedFromName}`}
            </Text>
          ) : null}
          {/* A fixed-height window onto the full text, so it scrolls in place. */}
          <ScrollView nestedScrollEnabled style={{ height: previewHeight }}>
            <Text selectable style={textStyle}>
              {model.text}
            </Text>
          </ScrollView>
        </>
      ) : (
        <View style={[styles.empty, { minHeight: previewHeight }]}>
          <Text style={styles.note}>{ADD_LYRICS_PROMPT}</Text>
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
    gap: appTheme.space.sm,
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
