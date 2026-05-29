import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Playlist } from '@org/audio-library-models';
import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';

import { getSavedPlaylistDetailRemoveActionPresentation } from '../utils/saved-playlist-detail-view-model';
import { savedPlaylistSectionStyles as styles } from './saved-playlist-section-styles';

type PlaylistEntry = Playlist['items'][number];

const getRowStatusLabel = (options: {
  isCurrentEntry: boolean;
  isPlayable: boolean;
}) => {
  if (options.isCurrentEntry) {
    return 'Playing';
  }

  if (options.isPlayable) {
    return 'Tap to play';
  }

  return 'Unavailable';
};

const PlaylistDetailEditControls = (props: {
  entryTitle: string;
  getCurrentScrollOffsetY: () => number;
  getEntryIndex: () => number;
  itemHeight: number;
  index: number;
  isMutating: boolean;
  itemCount: number;
  onReorderDragActiveChange: (isActive: boolean) => void;
  onReorderDragMove: (moveY: number) => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onRemoveItem: (entryId: string) => void;
  entryId: string;
}) => {
  const canMoveUp = props.index > 0;
  const canMoveDown = props.index < props.itemCount - 1;
  const dragAnchorMoveYRef = useRef<number | null>(null);
  const stepDistance = Math.max(props.itemHeight * 0.82, 44);
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => {
        return !props.isMutating;
      },
      onStartShouldSetPanResponderCapture: () => {
        return !props.isMutating;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return !props.isMutating && Math.abs(gestureState.dy) > 5;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return !props.isMutating && Math.abs(gestureState.dy) > 5;
      },
      onPanResponderTerminationRequest: () => {
        return false;
      },
      onShouldBlockNativeResponder: () => {
        return true;
      },
      onPanResponderGrant: () => {
        props.onReorderDragActiveChange(true);
        dragAnchorMoveYRef.current = null;
      },
      onPanResponderMove: (_, gestureState) => {
        props.onReorderDragMove(gestureState.moveY);

        if (props.isMutating) {
          return;
        }

        const effectiveMoveY =
          gestureState.moveY + props.getCurrentScrollOffsetY();

        if (dragAnchorMoveYRef.current === null) {
          dragAnchorMoveYRef.current = effectiveMoveY;
          return;
        }

        let delta = effectiveMoveY - dragAnchorMoveYRef.current;

        while (Math.abs(delta) >= stepDistance) {
          const direction = delta > 0 ? 1 : -1;
          const currentIndex = props.getEntryIndex();

          if (currentIndex < 0) {
            break;
          }

          const nextIndex = Math.min(
            Math.max(currentIndex + direction, 0),
            props.itemCount - 1,
          );

          if (nextIndex === currentIndex) {
            break;
          }

          props.onMoveItem(currentIndex, nextIndex);
          dragAnchorMoveYRef.current += direction * stepDistance;
          delta = effectiveMoveY - dragAnchorMoveYRef.current;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        props.onReorderDragActiveChange(false);
        props.onReorderDragMove(gestureState.moveY);
        dragAnchorMoveYRef.current = null;
      },
      onPanResponderTerminate: () => {
        props.onReorderDragActiveChange(false);
        dragAnchorMoveYRef.current = null;
      },
    });
  }, [
    props.getCurrentScrollOffsetY,
    props.getEntryIndex,
    props.itemHeight,
    props.index,
    props.isMutating,
    props.itemCount,
    props.onReorderDragMove,
    props.onMoveItem,
    props.onReorderDragActiveChange,
    stepDistance,
  ]);

  return (
    <View style={styles.actionRow}>
      <View
        accessibilityLabel={`Drag ${props.entryTitle} to reorder`}
        accessibilityRole="adjustable"
        style={styles.dragHandleButton}
        {...panResponder.panHandlers}
      >
        <MaterialCommunityIcons color="#5f5647" name="drag" size={18} />
        <Text style={styles.dragHandleLabel}>Drag</Text>
      </View>
      <Pressable
        accessibilityLabel={`Move ${props.entryTitle} up`}
        accessibilityRole="button"
        disabled={props.isMutating || !canMoveUp}
        onPress={() => {
          props.onMoveItem(props.index, props.index - 1);
        }}
        style={({ pressed }) => [
          styles.compactIconButton,
          pressed && !props.isMutating && canMoveUp
            ? styles.actionButtonPressed
            : undefined,
          props.isMutating || !canMoveUp
            ? styles.actionButtonDisabled
            : undefined,
        ]}
      >
        <MaterialCommunityIcons color="#1f1c17" name="arrow-up" size={16} />
      </Pressable>
      <Pressable
        accessibilityLabel={`Move ${props.entryTitle} down`}
        accessibilityRole="button"
        disabled={props.isMutating || !canMoveDown}
        onPress={() => {
          props.onMoveItem(props.index, props.index + 1);
        }}
        style={({ pressed }) => [
          styles.compactIconButton,
          pressed && !props.isMutating && canMoveDown
            ? styles.actionButtonPressed
            : undefined,
          props.isMutating || !canMoveDown
            ? styles.actionButtonDisabled
            : undefined,
        ]}
      >
        <MaterialCommunityIcons
          color="#1f1c17"
          name="arrow-down"
          size={16}
        />
      </Pressable>
      <Pressable
        accessibilityLabel={`Remove ${props.entryTitle} from playlist`}
        accessibilityRole="button"
        disabled={props.isMutating}
        onPress={() => {
          props.onRemoveItem(props.entryId);
        }}
        style={({ pressed }) => [
          styles.destructiveButton,
          styles.iconOnlyDestructiveButton,
          pressed && !props.isMutating ? styles.actionButtonPressed : undefined,
          props.isMutating ? styles.actionButtonDisabled : undefined,
        ]}
      >
        <MaterialCommunityIcons
          color="#8a2d1f"
          name="trash-can-outline"
          size={16}
        />
      </Pressable>
    </View>
  );
};

export const SavedPlaylistDetailItemsList = (props: {
  currentPlaylistEntryId: string | null;
  detailEntries: PlaylistEntry[];
  getCurrentScrollOffsetY: () => number;
  getItemDetailLabel: (entry: PlaylistEntry) => string;
  isEditMode: boolean;
  isItemPlayable: (entry: PlaylistEntry) => boolean;
  isMutating: boolean;
  onReorderDragActiveChange: (isActive: boolean) => void;
  onReorderDragMove: (moveY: number) => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onPlayPlaylistEntry: (entryId: string) => void;
  onRemoveItem: (entryId: string) => void;
}) => {
  const measuredItemHeightRef = useRef(102);

  useEffect(() => {
    if (!props.isEditMode) {
      props.onReorderDragActiveChange(false);
    }

    return () => {
      props.onReorderDragActiveChange(false);
    };
  }, [props.isEditMode, props.onReorderDragActiveChange]);

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>
        {props.isEditMode ? 'Edit items' : 'Current items'} (
        {props.detailEntries.length})
      </Text>
      {props.detailEntries.length === 0 ? (
        <Text style={styles.emptyMessage}>
          This playlist is empty. Return to Library, add saved tracks or loops
          there, then come back here to review the running order.
        </Text>
      ) : (
        <View style={styles.groupItems}>
          {props.detailEntries.map((entry, index) => {
            const isCurrentEntry = props.currentPlaylistEntryId === entry.id;
            const isPlayable = props.isItemPlayable(entry);
            const removeActionPresentation =
              getSavedPlaylistDetailRemoveActionPresentation(props.isEditMode);

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
                <View style={styles.itemTopRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={props.isMutating || !isPlayable}
                    onPress={() => {
                      if (props.isEditMode) {
                        return;
                      }

                      props.onPlayPlaylistEntry(entry.id);
                    }}
                    style={({ pressed }) => [
                      styles.itemPressable,
                      styles.itemPressableContent,
                      pressed && !props.isMutating && isPlayable
                        ? styles.actionButtonPressed
                        : undefined,
                    ]}
                  >
                    <View style={styles.itemHeaderRow}>
                      <Text style={styles.itemTitle}>
                        {index + 1}. {entry.title}
                      </Text>
                      <Text
                        style={
                          isCurrentEntry
                            ? styles.itemStatusActive
                            : isPlayable
                              ? styles.itemStatusReady
                              : styles.itemStatusUnavailable
                        }
                      >
                        {props.isEditMode
                          ? 'Edit'
                          : getRowStatusLabel({ isCurrentEntry, isPlayable })}
                      </Text>
                    </View>
                    <Text style={styles.itemMetadata}>
                      {props.getItemDetailLabel(entry)}
                    </Text>
                  </Pressable>

                  {removeActionPresentation.isIconOnly ? (
                    <Pressable
                      accessibilityLabel={`Remove ${entry.title} from playlist`}
                      accessibilityRole="button"
                      disabled={props.isMutating}
                      onPress={() => {
                        props.onRemoveItem(entry.id);
                      }}
                      style={({ pressed }) => [
                        styles.destructiveIconButton,
                        styles.inlineRowIconButton,
                        pressed && !props.isMutating
                          ? styles.actionButtonPressed
                          : undefined,
                        props.isMutating
                          ? styles.actionButtonDisabled
                          : undefined,
                      ]}
                    >
                      <MaterialCommunityIcons
                        color="#1f1c17"
                        name="trash-can-outline"
                        size={16}
                      />
                    </Pressable>
                  ) : null}
                </View>

                {props.isEditMode ? (
                  <PlaylistDetailEditControls
                    entryId={entry.id}
                    entryTitle={entry.title}
                    getCurrentScrollOffsetY={props.getCurrentScrollOffsetY}
                    getEntryIndex={() => {
                      return props.detailEntries.findIndex((detailEntry) => {
                        return detailEntry.id === entry.id;
                      });
                    }}
                    itemHeight={measuredItemHeightRef.current}
                    index={index}
                    isMutating={props.isMutating}
                    itemCount={props.detailEntries.length}
                    onReorderDragActiveChange={
                      props.onReorderDragActiveChange
                    }
                    onReorderDragMove={props.onReorderDragMove}
                    onMoveItem={props.onMoveItem}
                    onRemoveItem={props.onRemoveItem}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};
