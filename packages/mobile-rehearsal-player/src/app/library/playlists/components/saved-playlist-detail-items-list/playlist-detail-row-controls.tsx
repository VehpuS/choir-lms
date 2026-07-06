import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useRef } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';

import { OverflowMenuTrigger } from '../../../../components/overflow-menu-trigger';
import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { OptionsMenuSheet } from '../../../components/options-menu-sheet';
import { savedPlaylistSectionStyles as styles } from '../../../components/saved-playlist-section-styles';
import { getPlaylistDetailRowControlState } from './playlist-detail-row-controls-model';

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
  const dragAnchorMoveYRef = useRef<number | null>(null);
  const hasMovedDuringDragRef = useRef(false);
  const stepDistance = Math.max(props.itemHeight * 0.82, 44);
  const controlState = getPlaylistDetailRowControlState({
    entryId: props.entryId,
    entryTitle: props.entryTitle,
    index: props.index,
    isCurrentEntry: props.isCurrentEntry,
    isItemPlayable: props.isItemPlayable,
    isMutating: props.isMutating,
    itemCount: props.itemCount,
    playbackToggleDisabled: props.playbackToggleDisabled,
    playbackToggleLabel: props.playbackToggleLabel,
  });

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => {
        return controlState.canDragReorder;
      },
      onStartShouldSetPanResponderCapture: () => {
        return controlState.canDragReorder;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return controlState.canDragReorder && Math.abs(gestureState.dy) > 5;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return controlState.canDragReorder && Math.abs(gestureState.dy) > 5;
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

        if (!controlState.canDragReorder) {
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
    controlState.canDragReorder,
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
              !controlState.canDragReorder
                ? styles.playlistRowDragHandleDisabled
                : null,
            ]}
            {...(controlState.canDragReorder ? panResponder.panHandlers : {})}
          >
            <MaterialCommunityIcons color="#5f5647" name="drag" size={18} />
          </View>
          <SurfaceIconButton
            accessibilityLabel={controlState.playbackAction.accessibilityLabel}
            disabled={controlState.isPlaybackButtonDisabled}
            icon={controlState.playbackAction.iconName}
            onPress={
              controlState.playbackAction.pressBehavior === 'toggle-current'
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
              disabled={props.isMutating || !controlState.canMoveUp}
              onPress={() => {
                props.onMoveItem(props.index, props.index - 1, {
                  persist: true,
                });
              }}
              style={({ pressed }) => [
                styles.playlistRowStepButton,
                pressed && !props.isMutating && controlState.canMoveUp
                  ? styles.actionButtonPressed
                  : undefined,
                props.isMutating || !controlState.canMoveUp
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
              disabled={props.isMutating || !controlState.canMoveDown}
              onPress={() => {
                props.onMoveItem(props.index, props.index + 1, {
                  persist: true,
                });
              }}
              style={({ pressed }) => [
                styles.playlistRowStepButton,
                pressed && !props.isMutating && controlState.canMoveDown
                  ? styles.actionButtonPressed
                  : undefined,
                props.isMutating || !controlState.canMoveDown
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
              {controlState.rowStatusLabel}
            </Text>
          </View>
          <Text style={styles.itemMetadata}>{props.metadataLabel}</Text>
        </View>
      </View>

      <OptionsMenuSheet
        actions={controlState.menuActions.map((action) => ({
          ...action,
          onPress: () => {
            props.onCloseMenu();

            if (action.kind === 'move-to-position') {
              props.onRequestMoveToPosition(props.entryId);
              return;
            }

            props.onRemoveItem(props.entryId);
          },
        }))}
        isVisible={props.isMenuVisible}
        onClose={props.onCloseMenu}
        title={props.entryTitle}
      />
    </>
  );
};
