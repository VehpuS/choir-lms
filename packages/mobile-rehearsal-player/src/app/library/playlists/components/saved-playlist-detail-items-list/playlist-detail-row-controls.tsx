import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useRef } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';

import { OverflowMenuTrigger } from '../../../../components/overflow-menu-trigger';
import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { OptionsMenuSheet } from '../../../components/options-menu-sheet';
import { savedPlaylistSectionStyles as styles } from '../../../components/saved-playlist-section-styles';
import { getSavedPlaylistDetailPlaybackAction } from '../../utils/saved-playlist-detail-view-model';

const getRowStatusLabel = (options: {
  isCurrentEntry: boolean;
  isPlayable: boolean;
  playbackToggleLabel: string;
}) => {
  if (options.isCurrentEntry) {
    return options.playbackToggleLabel === 'Pause' ? 'Playing' : 'Current';
  }

  if (options.isPlayable) {
    return 'Ready';
  }

  return 'Unavailable';
};

export const PlaylistDetailRowControls = (props: {
  entryId: string;
  entryTitle: string;
  getCurrentScrollOffsetY: () => number;
  getEntryIndex: () => number;
  index: number;
  isCurrentEntry: boolean;
  isItemPlayable: boolean;
  isMenuVisible: boolean;
  isMutating: boolean;
  itemCount: number;
  itemHeight: number;
  metadataLabel: string;
  onCloseMenu: () => void;
  onCommitReorder: () => void;
  onMoveItem: (
    fromIndex: number,
    toIndex: number,
    options?: { persist?: boolean },
  ) => void;
  onPlayItem: () => void;
  onRemoveItem: (entryId: string) => void;
  onReorderDragActiveChange: (isActive: boolean) => void;
  onReorderDragMove: (moveY: number) => void;
  onRequestMoveToPosition: (entryId: string) => void;
  onShowMenu: () => void;
  onToggleCurrentPlayback: () => void;
  playbackToggleDisabled: boolean;
  playbackToggleLabel: string;
}) => {
  const canMoveUp = props.index > 0;
  const canMoveDown = props.index < props.itemCount - 1;
  const canMoveToPosition = props.itemCount > 1;
  const canDragReorder = props.itemCount > 1 && !props.isMutating;
  const dragAnchorMoveYRef = useRef<number | null>(null);
  const hasMovedDuringDragRef = useRef(false);
  const stepDistance = Math.max(props.itemHeight * 0.82, 44);
  const playbackAction = getSavedPlaylistDetailPlaybackAction({
    isCurrentEntry: props.isCurrentEntry,
    playbackToggleLabel: props.playbackToggleLabel,
    title: props.entryTitle,
  });
  const isPlaybackButtonDisabled =
    props.isMutating ||
    props.playbackToggleDisabled ||
    (!props.isCurrentEntry && !props.isItemPlayable);

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => {
        return canDragReorder;
      },
      onStartShouldSetPanResponderCapture: () => {
        return canDragReorder;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return canDragReorder && Math.abs(gestureState.dy) > 5;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return canDragReorder && Math.abs(gestureState.dy) > 5;
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
        hasMovedDuringDragRef.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        props.onReorderDragMove(gestureState.moveY);

        if (!canDragReorder) {
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
          hasMovedDuringDragRef.current = true;
          dragAnchorMoveYRef.current += direction * stepDistance;
          delta = effectiveMoveY - dragAnchorMoveYRef.current;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        props.onReorderDragActiveChange(false);
        props.onReorderDragMove(gestureState.moveY);

        if (hasMovedDuringDragRef.current) {
          props.onCommitReorder();
        }

        dragAnchorMoveYRef.current = null;
        hasMovedDuringDragRef.current = false;
      },
      onPanResponderTerminate: () => {
        props.onReorderDragActiveChange(false);
        dragAnchorMoveYRef.current = null;
        hasMovedDuringDragRef.current = false;
      },
    });
  }, [
    canDragReorder,
    props.getCurrentScrollOffsetY,
    props.getEntryIndex,
    props.itemCount,
    props.itemHeight,
    props.onCommitReorder,
    props.onMoveItem,
    props.onReorderDragActiveChange,
    props.onReorderDragMove,
    stepDistance,
  ]);

  return (
    <>
      <View style={styles.playlistRowShell}>
        <View style={styles.playlistRowControlRow}>
          <View
            accessibilityLabel={`Drag ${props.entryTitle} to reorder`}
            accessibilityRole="adjustable"
            style={[
              styles.playlistRowDragHandle,
              !canDragReorder ? styles.playlistRowDragHandleDisabled : null,
            ]}
            {...(canDragReorder ? panResponder.panHandlers : {})}
          >
            <MaterialCommunityIcons color="#5f5647" name="drag" size={18} />
          </View>
          <SurfaceIconButton
            accessibilityLabel={playbackAction.accessibilityLabel}
            disabled={isPlaybackButtonDisabled}
            icon={playbackAction.iconName}
            onPress={
              playbackAction.pressBehavior === 'toggle-current'
                ? props.onToggleCurrentPlayback
                : props.onPlayItem
            }
            size={18}
          />
          <View style={styles.playlistRowControlSpacer} />
          <View style={styles.playlistRowStepControls}>
            <Pressable
              accessibilityLabel={`Move ${props.entryTitle} up`}
              accessibilityRole="button"
              disabled={props.isMutating || !canMoveUp}
              onPress={() => {
                props.onMoveItem(props.index, props.index - 1, {
                  persist: true,
                });
              }}
              style={({ pressed }) => [
                styles.playlistRowStepButton,
                pressed && !props.isMutating && canMoveUp
                  ? styles.actionButtonPressed
                  : undefined,
                props.isMutating || !canMoveUp
                  ? styles.actionButtonDisabled
                  : undefined,
              ]}
            >
              <MaterialCommunityIcons
                color="#1f1c17"
                name="arrow-up"
                size={16}
              />
            </Pressable>
            <Pressable
              accessibilityLabel={`Move ${props.entryTitle} down`}
              accessibilityRole="button"
              disabled={props.isMutating || !canMoveDown}
              onPress={() => {
                props.onMoveItem(props.index, props.index + 1, {
                  persist: true,
                });
              }}
              style={({ pressed }) => [
                styles.playlistRowStepButton,
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
          </View>
          <OverflowMenuTrigger
            accessibilityLabel={`More actions for ${props.entryTitle}`}
            disabled={props.isMutating}
            onPress={props.onShowMenu}
            style={styles.playlistRowOverflowTrigger}
          />
        </View>
        <View style={styles.playlistRowCopy}>
          <View style={styles.itemHeaderRow}>
            <Text numberOfLines={2} style={styles.itemTitle}>
              {props.index + 1}. {props.entryTitle}
            </Text>
            <Text
              style={
                props.isCurrentEntry
                  ? styles.itemStatusActive
                  : props.isItemPlayable
                    ? styles.itemStatusReady
                    : styles.itemStatusUnavailable
              }
            >
              {getRowStatusLabel({
                isCurrentEntry: props.isCurrentEntry,
                isPlayable: props.isItemPlayable,
                playbackToggleLabel: props.playbackToggleLabel,
              })}
            </Text>
          </View>
          <Text style={styles.itemMetadata}>{props.metadataLabel}</Text>
        </View>
      </View>

      <OptionsMenuSheet
        actions={[
          {
            disabled: !canMoveToPosition,
            id: `${props.entryId}:move-to-position`,
            label: 'Move to position',
            onPress: () => {
              props.onCloseMenu();
              props.onRequestMoveToPosition(props.entryId);
            },
          },
          {
            disabled: props.isMutating,
            id: `${props.entryId}:remove`,
            label: 'Remove from playlist',
            onPress: () => {
              props.onCloseMenu();
              props.onRemoveItem(props.entryId);
            },
            tone: 'destructive',
          },
        ]}
        isVisible={props.isMenuVisible}
        onClose={props.onCloseMenu}
        title={props.entryTitle}
      />
    </>
  );
};