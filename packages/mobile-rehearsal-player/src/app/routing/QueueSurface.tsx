import type { RehearsalQueueMode, RepeatMode } from '@org/audio-library-models';
import { type ComponentProps, useEffect, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';

import {
  QueuePlaylistActionRow,
  SurfaceIconButton,
} from './PlaybackSurfaceControls';
import { PlaybackSessionModeCard } from './PlaybackSessionModeCard';
import { QueueSurfaceRow } from './QueueSurfaceRow';
import { styles } from './playback-surface-styles';
import { getQueueListMaxHeight } from './queue-surface-layout';
import type { UpNextSurfaceSummary } from './shell-model';

type QueueSurfaceProps = {
  activeQueueMode: RehearsalQueueMode;
  activeRepeatMode: RepeatMode;
  dragHandleProps?: ComponentProps<typeof View>;
  isSavingQueueAsPlaylist: boolean;
  isPlaybackToggleDisabled: boolean;
  onAppendQueueToPlaylist: () => void;
  onClose: () => void;
  onMoveQueueItem: (fromIndex: number, toIndex: number) => void;
  onMoveQueueItemToEnd: (index: number) => void;
  onMoveQueueItemToStart: (index: number) => void;
  onPlayQueueItem: (index: number) => void;
  onRemoveQueueItem: (index: number) => void;
  onSaveQueueAsPlaylist: () => void;
  onSelectQueueMode: (mode: RehearsalQueueMode) => void;
  onSelectRepeatMode: (mode: RepeatMode) => void;
  onShowNowPlaying: () => void;
  onTogglePlayback: () => void;
  playbackToggleLabel: string;
  summary: UpNextSurfaceSummary;
};

export const QueueSurface = ({
  activeQueueMode,
  activeRepeatMode,
  dragHandleProps,
  isSavingQueueAsPlaylist,
  isPlaybackToggleDisabled,
  onAppendQueueToPlaylist,
  onClose,
  onMoveQueueItem,
  onMoveQueueItemToEnd,
  onMoveQueueItemToStart,
  onPlayQueueItem,
  onRemoveQueueItem,
  onSaveQueueAsPlaylist,
  onSelectQueueMode,
  onSelectRepeatMode,
  onShowNowPlaying,
  onTogglePlayback,
  playbackToggleLabel,
  summary,
}: QueueSurfaceProps) => {
  const { height: windowHeight } = useWindowDimensions();
  const queueListMaxHeight = getQueueListMaxHeight(windowHeight);
  const [activeOptionsItemKey, setActiveOptionsItemKey] = useState<
    string | null
  >(null);
  const [isQueueRowDragActive, setIsQueueRowDragActive] = useState(false);

  useEffect(() => {
    setActiveOptionsItemKey((currentKey) => {
      if (!currentKey) {
        return currentKey;
      }

      return summary.items.some((item) => item.key === currentKey)
        ? currentKey
        : null;
    });
  }, [summary.items]);

  return (
    <View style={styles.sheetCard}>
      <View {...dragHandleProps} style={styles.surfaceDragHandleRegion}>
        <View style={styles.surfaceHandle} />
        <View style={styles.sheetHeaderRow}>
          <Text style={styles.sheetEyebrow}>Up Next</Text>
          <View style={styles.headerActionRow}>
            <SurfaceIconButton
              accessibilityLabel="Show now playing"
              icon="play-circle-outline"
              onPress={onShowNowPlaying}
            />
            <SurfaceIconButton
              accessibilityLabel="Dismiss queue"
              icon="chevron-down"
              onPress={onClose}
            />
          </View>
        </View>
      </View>

      <View style={styles.summaryGroup}>
        <Text style={styles.queueSurfaceTitle}>Active rehearsal queue</Text>
        <Text style={styles.subtitle}>{summary.collectionLabel}</Text>
      </View>

      {summary.queuePlaylistActions ? (
        <QueuePlaylistActionRow
          actions={summary.queuePlaylistActions}
          isMutating={isSavingQueueAsPlaylist}
          onAppendQueueToPlaylist={onAppendQueueToPlaylist}
          onSaveQueueAsPlaylist={onSaveQueueAsPlaylist}
        />
      ) : null}

      <PlaybackSessionModeCard
        isDisabled={isPlaybackToggleDisabled}
        onSelectQueueMode={onSelectQueueMode}
        onSelectRepeatMode={onSelectRepeatMode}
        queueMode={activeQueueMode}
        repeatMode={activeRepeatMode}
      />

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.queueListContent}
        scrollEnabled={!isQueueRowDragActive}
        showsVerticalScrollIndicator={summary.items.length > 4}
        style={[styles.queueList, { maxHeight: queueListMaxHeight }]}
      >
        {summary.items.map((item) => {
          return (
            <QueueSurfaceRow
              key={item.key}
              isPlaybackToggleDisabled={isPlaybackToggleDisabled}
              isVisible={activeOptionsItemKey === item.key}
              item={item}
              itemCount={summary.items.length}
              onCloseMenu={() => {
                setActiveOptionsItemKey(null);
              }}
              onMoveItem={onMoveQueueItem}
              onMoveItemToEnd={onMoveQueueItemToEnd}
              onMoveItemToStart={onMoveQueueItemToStart}
              onPlayItem={() => {
                const itemIndex = summary.items.findIndex((queuedItem) => {
                  return queuedItem.key === item.key;
                });

                if (itemIndex >= 0) {
                  onPlayQueueItem(itemIndex);
                }
              }}
              onRemoveItem={onRemoveQueueItem}
              onSetDragActive={setIsQueueRowDragActive}
              onShowMenu={() => {
                setActiveOptionsItemKey(item.key);
              }}
              onToggleCurrentPlayback={onTogglePlayback}
              playbackToggleLabel={playbackToggleLabel}
              resolveItemIndex={() => {
                return summary.items.findIndex((queuedItem) => {
                  return queuedItem.key === item.key;
                });
              }}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};
