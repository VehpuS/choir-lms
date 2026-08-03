import type { Playlist } from '@org/audio-library-models';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { QueueMovePositionDialog } from '../../../../components/queue-move-position-dialog';
import { savedPlaylistSectionStyles as styles } from '../../../components/saved-playlist-section-styles';
import { PlaylistDetailRowControls } from './playlist-detail-row-controls';

type PlaylistEntry = Playlist['items'][number];

export const SavedPlaylistDetailItemsList = (props: {
  currentPlaylistEntryId: string | null;
  detailEntries: PlaylistEntry[];
  emptyStateActionLabel: string | null;
  emptyStateMessage: string;
  getCurrentScrollOffsetY: () => number;
  getItemDetailLabel: (entry: PlaylistEntry) => string;
  isItemPlayable: (entry: PlaylistEntry) => boolean;
  isMutating: boolean;
  onAddItemsFromEmptyState?: () => void;
  onCommitReorder: () => void;
  onMoveItem: (
    fromIndex: number,
    toIndex: number,
    options?: { persist?: boolean },
  ) => void;
  onPlayPlaylistEntry: (entryId: string) => void;
  onRemoveItem: (entryId: string) => void;
  onReorderDragActiveChange: (isActive: boolean) => void;
  onReorderDragMove: (moveY: number) => void;
  onToggleCurrentPlayback: () => void;
  playbackToggleDisabled: boolean;
  playbackToggleLabel: string;
}) => {
  const measuredItemHeightRef = useRef(102);
  const [activeOptionsEntryId, setActiveOptionsEntryId] = useState<
    string | null
  >(null);
  const [activeMovePositionEntryId, setActiveMovePositionEntryId] = useState<
    string | null
  >(null);

  useEffect(() => {
    setActiveOptionsEntryId((currentEntryId) => {
      if (!currentEntryId) {
        return currentEntryId;
      }

      return props.detailEntries.some((entry) => entry.id === currentEntryId)
        ? currentEntryId
        : null;
    });

    setActiveMovePositionEntryId((currentEntryId) => {
      if (!currentEntryId) {
        return currentEntryId;
      }

      return props.detailEntries.some((entry) => entry.id === currentEntryId)
        ? currentEntryId
        : null;
    });
  }, [props.detailEntries]);

  useEffect(() => {
    return () => {
      props.onReorderDragActiveChange(false);
    };
  }, [props.onReorderDragActiveChange]);

  const activeMovePositionEntry = props.detailEntries.find((entry) => {
    return entry.id === activeMovePositionEntryId;
  });
  const activeMovePositionIndex = activeMovePositionEntry
    ? props.detailEntries.findIndex((entry) => {
        return entry.id === activeMovePositionEntry.id;
      })
    : -1;

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>
        Items ({props.detailEntries.length})
      </Text>
      {props.detailEntries.length === 0 ? (
        <View style={styles.playlistRowShell}>
          <Text style={styles.emptyMessage}>{props.emptyStateMessage}</Text>
          {props.emptyStateActionLabel && props.onAddItemsFromEmptyState ? (
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={props.isMutating}
                onPress={props.onAddItemsFromEmptyState}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && !props.isMutating
                    ? styles.actionButtonPressed
                    : undefined,
                  props.isMutating ? styles.actionButtonDisabled : undefined,
                ]}
              >
                <Text style={styles.secondaryButtonLabel}>
                  {props.emptyStateActionLabel}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.groupItems}>
          {props.detailEntries.map((entry, index) => {
            const isCurrentEntry = props.currentPlaylistEntryId === entry.id;
            const isPlayable = props.isItemPlayable(entry);

            return (
              <View
                key={entry.id}
                onLayout={(event) => {
                  const measuredHeight = event.nativeEvent.layout.height;

                  if (measuredHeight > 0) {
                    measuredItemHeightRef.current = measuredHeight;
                  }
                }}
                style={[
                  styles.itemCard,
                  isCurrentEntry ? styles.itemCardActive : undefined,
                  !isPlayable ? styles.itemCardUnavailable : undefined,
                ]}
              >
                <PlaylistDetailRowControls
                  entryId={entry.id}
                  entryTitle={entry.title}
                  getCurrentScrollOffsetY={props.getCurrentScrollOffsetY}
                  getEntryIndex={() => {
                    return props.detailEntries.findIndex((detailEntry) => {
                      return detailEntry.id === entry.id;
                    });
                  }}
                  index={index}
                  isCurrentEntry={isCurrentEntry}
                  isItemPlayable={isPlayable}
                  isMenuVisible={activeOptionsEntryId === entry.id}
                  isMutating={props.isMutating}
                  itemCount={props.detailEntries.length}
                  itemHeight={measuredItemHeightRef.current}
                  metadataLabel={props.getItemDetailLabel(entry)}
                  onCloseMenu={() => {
                    setActiveOptionsEntryId(null);
                  }}
                  onCommitReorder={props.onCommitReorder}
                  onMoveItem={props.onMoveItem}
                  onPlayItem={() => {
                    props.onPlayPlaylistEntry(entry.id);
                  }}
                  onRemoveItem={props.onRemoveItem}
                  onReorderDragActiveChange={props.onReorderDragActiveChange}
                  onReorderDragMove={props.onReorderDragMove}
                  onRequestMoveToPosition={(entryId) => {
                    setActiveMovePositionEntryId(entryId);
                  }}
                  onShowMenu={() => {
                    setActiveOptionsEntryId(entry.id);
                  }}
                  onToggleCurrentPlayback={props.onToggleCurrentPlayback}
                  playbackToggleDisabled={props.playbackToggleDisabled}
                  playbackToggleLabel={props.playbackToggleLabel}
                />
              </View>
            );
          })}
        </View>
      )}

      {activeMovePositionEntry ? (
        <QueueMovePositionDialog
          bodyText={`Choose a new playlist position for ${activeMovePositionEntry.title}. Playlist detail stays open while this running order updates.`}
          currentIndex={activeMovePositionIndex}
          isVisible
          itemCount={props.detailEntries.length}
          itemTitle={activeMovePositionEntry.title}
          onCancel={() => {
            setActiveMovePositionEntryId(null);
          }}
          onSubmit={(targetIndex: number) => {
            if (
              activeMovePositionIndex >= 0 &&
              activeMovePositionIndex !== targetIndex
            ) {
              props.onMoveItem(activeMovePositionIndex, targetIndex, {
                persist: true,
              });
            }

            setActiveMovePositionEntryId(null);
          }}
        />
      ) : null}
    </View>
  );
};
