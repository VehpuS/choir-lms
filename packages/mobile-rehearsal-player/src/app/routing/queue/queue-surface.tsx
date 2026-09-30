import type { RehearsalQueueMode, RepeatMode } from '@org/audio-library-models';
import { type ComponentProps, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { FadedRule } from '../../components/faded-rule';
import { QueueMovePositionDialog } from '../../components/queue-move-position-dialog';
import { SurfaceIconButton } from '../../components/surface-icon-button';
import { ExplorerListSurface } from '../../library/components/explorer';
import { InteractionChip } from '../../library/components/interaction-chip';
import { nowPlayingStyles } from '../playback/now-playing/styles';
import { appTheme } from '../../utils/theme';
import type { UpNextSurfaceSummary } from '../shell/shell-model';
import { QueuePlaylistActionRow } from './queue-playlist-action-row';
import { getQueueModeChips } from './queue-mode-chips-model';
import { QueueSurfaceRow } from './queue-surface-row';
import { queueStyles as styles } from './styles';

const MODE_CHIP_ICON_SIZE = 18;

type QueueSurfaceProps = {
  activeQueueMode: RehearsalQueueMode;
  activeRepeatMode: RepeatMode;
  dragHandleProps?: ComponentProps<typeof View>;
  isSavingQueueAsPlaylist: boolean;
  isPlaybackLoading: boolean;
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
  onTogglePlayback: () => void;
  playbackToggleLabel: string;
  summary: UpNextSurfaceSummary;
};

// Drops a remembered row key once its item leaves the queue.
const keepKeyIfQueued = (
  currentKey: string | null,
  items: UpNextSurfaceSummary['items'],
) => {
  if (!currentKey) {
    return currentKey;
  }

  return items.some((item) => item.key === currentKey) ? currentKey : null;
};

export const QueueSurface = ({
  activeQueueMode,
  activeRepeatMode,
  dragHandleProps,
  isSavingQueueAsPlaylist,
  isPlaybackLoading,
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
  onTogglePlayback,
  playbackToggleLabel,
  summary,
}: QueueSurfaceProps) => {
  // Queue controls stay usable while the current item loads (8.33).
  const isQueueControlDisabled = isPlaybackToggleDisabled && !isPlaybackLoading;
  const [activeOptionsItemKey, setActiveOptionsItemKey] = useState<
    string | null
  >(null);
  const [activeMovePositionItemKey, setActiveMovePositionItemKey] = useState<
    string | null
  >(null);
  const [isQueueRowDragActive, setIsQueueRowDragActive] = useState(false);
  const modeChips = getQueueModeChips({
    queueMode: activeQueueMode,
    repeatMode: activeRepeatMode,
  });

  useEffect(() => {
    setActiveOptionsItemKey((key) => keepKeyIfQueued(key, summary.items));
    setActiveMovePositionItemKey((key) => keepKeyIfQueued(key, summary.items));
  }, [summary.items]);

  const resolveItemIndex = (itemKey: string) => {
    return summary.items.findIndex((queuedItem) => queuedItem.key === itemKey);
  };
  const activeMovePositionItem = summary.items.find((item) => {
    return item.key === activeMovePositionItemKey;
  });
  const activeMovePositionIndex = activeMovePositionItem
    ? resolveItemIndex(activeMovePositionItem.key)
    : -1;

  return (
    <View style={nowPlayingStyles.sheet}>
      <View {...dragHandleProps} style={styles.dragRegion}>
        <View style={nowPlayingStyles.grabber} />
        <View style={nowPlayingStyles.header}>
          <Text style={nowPlayingStyles.headerKicker}>Up Next</Text>
          <View style={nowPlayingStyles.headerActions}>
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

      <View style={styles.titleBlock}>
        <Text numberOfLines={2} style={styles.title}>
          {summary.title}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {summary.metaLabel}
        </Text>
        <View style={styles.chipRow}>
          {modeChips.map((chip) => {
            return (
              <InteractionChip
                accessibilityHint={
                  chip.key === 'repeat' ? chip.accessibilityHint : undefined
                }
                accessibilityLabel={chip.accessibilityLabel}
                accessibilitySelected={chip.selected}
                disabled={isQueueControlDisabled}
                key={chip.key}
                label={chip.label}
                leadingIcon={
                  <AppIcon
                    color={
                      chip.selected
                        ? appTheme.colors.accentText
                        : appTheme.colors.icon
                    }
                    name={chip.icon}
                    size={MODE_CHIP_ICON_SIZE}
                  />
                }
                onPress={() => {
                  if (chip.key === 'repeat') {
                    onSelectRepeatMode(chip.mode);
                    return;
                  }

                  onSelectQueueMode(chip.mode);
                }}
                variant={chip.selected ? 'selected' : 'passive'}
              />
            );
          })}
        </View>
      </View>

      <FadedRule />

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.listContent}
        scrollEnabled={!isQueueRowDragActive}
        showsVerticalScrollIndicator={summary.items.length > 6}
        style={styles.list}
      >
        <ExplorerListSurface>
          {summary.items.map((item) => {
            return (
              <QueueSurfaceRow
                isPlaybackLoading={isPlaybackLoading}
                key={item.key}
                // The loading item's own row waits; other rows may supersede
                // its load.
                isPlaybackToggleDisabled={
                  item.isCurrent
                    ? isPlaybackToggleDisabled
                    : isQueueControlDisabled
                }
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
                  const itemIndex = resolveItemIndex(item.key);

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
                resolveItemIndex={() => resolveItemIndex(item.key)}
              />
            );
          })}
        </ExplorerListSurface>
      </ScrollView>

      {summary.queuePlaylistActions ? (
        <QueuePlaylistActionRow
          actions={summary.queuePlaylistActions}
          isMutating={isSavingQueueAsPlaylist}
          onRequestUpdateQueuePlaylist={onRequestUpdateQueuePlaylist}
          onSaveQueueAsPlaylist={onSaveQueueAsPlaylist}
        />
      ) : null}

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
