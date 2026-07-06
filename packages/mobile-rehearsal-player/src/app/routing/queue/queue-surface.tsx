import type { RehearsalQueueMode, RepeatMode } from '@org/audio-library-models';
import { type ComponentProps, useEffect, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { QueueMovePositionDialog } from '../../components/queue-move-position-dialog';
import { SurfaceIconButton } from '../../components/surface-icon-button';
import { PlaybackSessionModeCard } from '../playback/playback-session-mode-card';
import { styles } from '../playback/playback-surface-styles';
import type { UpNextSurfaceSummary } from '../shell/shell-model';
import { QueuePlaylistActionRow } from './queue-playlist-action-row';
import { getQueueListMaxHeight } from './queue-surface-layout';
import { QueueSurfaceRow } from './queue-surface-row';
import { getQueueSurfaceTransportActions } from './queue-surface-transport-model';

type QueueSurfaceProps = {
  activeQueueMode: RehearsalQueueMode;
  activeRepeatMode: RepeatMode;
  canSkipNextItem: boolean;
  canSkipPreviousItem: boolean;
  dragHandleProps?: ComponentProps<typeof View>;
  isSavingQueueAsPlaylist: boolean;
  isPlaybackToggleDisabled: boolean;
  onClose: () => void;
  onMoveQueueItem: (fromIndex: number, toIndex: number) => void;
  onMoveQueueItemToEnd: (index: number) => void;
  onMoveQueueItemToStart: (index: number) => void;
  onPlayQueueItem: (index: number) => void;
  onRemoveQueueItem: (index: number) => void;
  onRequestUpdateQueuePlaylist: (
    action: NonNullable<
      NonNullable<UpNextSurfaceSummary['queuePlaylistActions']>['updateAction']
    >,
  ) => void;
  onSaveQueueAsPlaylist: () => void;
  onSelectQueueMode: (mode: RehearsalQueueMode) => void;
  onSelectRepeatMode: (mode: RepeatMode) => void;
  onShowNowPlaying: () => void;
  onSkipNextItem: () => void;
  onSkipPreviousItem: () => void;
  onTogglePlayback: () => void;
  playbackToggleLabel: string;
  summary: UpNextSurfaceSummary;
};

export const QueueSurface = ({
  activeQueueMode,
  activeRepeatMode,
  canSkipNextItem,
  canSkipPreviousItem,
  dragHandleProps,
  isSavingQueueAsPlaylist,
  isPlaybackToggleDisabled,
  onClose,
  onMoveQueueItem,
  onMoveQueueItemToEnd,
  onMoveQueueItemToStart,
  onPlayQueueItem,
  onRemoveQueueItem,
  onRequestUpdateQueuePlaylist,
  onSaveQueueAsPlaylist,
  onSelectQueueMode,
  onSelectRepeatMode,
  onShowNowPlaying,
  onSkipNextItem,
  onSkipPreviousItem,
  onTogglePlayback,
  playbackToggleLabel,
  summary,
}: QueueSurfaceProps) => {
  const { height: windowHeight } = useWindowDimensions();
  const queueListMaxHeight = getQueueListMaxHeight(windowHeight);
  const [activeOptionsItemKey, setActiveOptionsItemKey] = useState<
    string | null
  >(null);
  const [activeMovePositionItemKey, setActiveMovePositionItemKey] = useState<
    string | null
  >(null);
  const [isQueueRowDragActive, setIsQueueRowDragActive] = useState(false);
  const transportActions = getQueueSurfaceTransportActions({
    canSkipNextItem,
    canSkipPreviousItem,
  });

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

  useEffect(() => {
    setActiveMovePositionItemKey((currentKey) => {
      if (!currentKey) {
        return currentKey;
      }

      return summary.items.some((item) => item.key === currentKey)
        ? currentKey
        : null;
    });
  }, [summary.items]);

  const activeMovePositionItem = summary.items.find((item) => {
    return item.key === activeMovePositionItemKey;
  });
  const activeMovePositionIndex = activeMovePositionItem
    ? summary.items.findIndex((item) => {
        return item.key === activeMovePositionItem.key;
      })
    : -1;

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
          onRequestUpdateQueuePlaylist={onRequestUpdateQueuePlaylist}
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

      <View style={styles.transportRow}>
        {transportActions.map((action) => {
          return (
            <SurfaceIconButton
              accessibilityLabel={action.accessibilityLabel}
              disabled={action.disabled}
              icon={action.icon}
              key={action.key}
              onPress={
                action.key === 'previous' ? onSkipPreviousItem : onSkipNextItem
              }
            />
          );
        })}
      </View>

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
              onRequestMoveToPosition={() => {
                setActiveMovePositionItemKey(item.key);
              }}
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

      {activeMovePositionItem ? (
        <QueueMovePositionDialog
          currentIndex={activeMovePositionIndex}
          isVisible
          itemCount={summary.items.length}
          itemTitle={activeMovePositionItem.title}
          onCancel={() => {
            setActiveMovePositionItemKey(null);
          }}
          onSubmit={(targetIndex) => {
            if (
              activeMovePositionIndex >= 0 &&
              activeMovePositionIndex !== targetIndex
            ) {
              onMoveQueueItem(activeMovePositionIndex, targetIndex);
            }

            setActiveMovePositionItemKey(null);
          }}
        />
      ) : null}
    </View>
  );
};
