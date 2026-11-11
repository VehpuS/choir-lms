import type { PlayableItem } from '@org/audio-library-models';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { darkScrollbarStyle } from '../../components/dark-scrollbar';
import { CompositeMixPanel } from '../../library/composite/mix/composite-mix-panel';
import { InteractionChip } from '../../library/components/interaction-chip';
import { LyricsSection } from '../../library/lyrics/components/lyrics-section';
import { appTheme } from '../../utils/theme';
import type { PlaybackTab, PlaybackTabKey } from './playback-tabs-model';

const { colors, space } = appTheme;

type PlaybackTabsPaneProps = {
  activePlayableItem: PlayableItem;
  onSelectTab: (key: PlaybackTabKey) => void;
  /** The Up next content, drawn by the caller (it needs the queue's handlers). */
  queueContent: ReactNode;
  selectedTab: PlaybackTabKey;
  /** The speed and pitch content, drawn by the caller. */
  shapingContent: ReactNode;
  tabs: readonly PlaybackTab[];
};

/**
 * The right half of the wide-short playback view: a row of tabs and the one
 * panel selected. Lyrics and a composite's Mix come from the now-playing sheet;
 * the queue and speed & pitch panels are the same surfaces the compact sheet
 * shows, without their own headers.
 */
export const PlaybackTabsPane = ({
  activePlayableItem,
  onSelectTab,
  queueContent,
  selectedTab,
  shapingContent,
  tabs,
}: PlaybackTabsPaneProps) => {
  return (
    <View style={styles.pane}>
      <View accessibilityRole="tablist" style={styles.tabRow}>
        {tabs.map((tab) => {
          const isSelected = tab.key === selectedTab;

          return (
            <InteractionChip
              accessibilityLabel={tab.label}
              accessibilitySelected={isSelected}
              key={tab.key}
              label={tab.label}
              onPress={() => {
                onSelectTab(tab.key);
              }}
              variant={isSelected ? 'selected' : 'passive'}
            />
          );
        })}
      </View>
      {selectedTab === 'queue' ? queueContent : null}
      {selectedTab === 'shaping' ? shapingContent : null}
      {selectedTab === 'lyrics' ? (
        <ScrollView
          contentContainerStyle={styles.content}
          style={[darkScrollbarStyle, styles.scroll]}
        >
          <LyricsSection item={activePlayableItem} />
        </ScrollView>
      ) : null}
      {selectedTab === 'mix' && activePlayableItem.kind === 'composite' ? (
        <ScrollView
          contentContainerStyle={styles.content}
          style={[darkScrollbarStyle, styles.scroll]}
        >
          <CompositeMixPanel compositeId={activePlayableItem.source.id} />
        </ScrollView>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  pane: {
    flex: 1,
    minWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: colors.borderSubtle,
    backgroundColor: colors.surfaceRaised,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    paddingHorizontal: space.sheetInset,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.sheetInset,
    paddingBottom: space.md,
  },
});
