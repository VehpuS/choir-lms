import { useRef, type ReactNode } from 'react';
import { View } from 'react-native';

import { moveItem } from './reorder-model';
import { ReorderControls } from './reorder-controls';
import { useDragReorder } from './use-drag-reorder';

/** What a row receives to place the reorder controls in its own layout. */
export type ReorderableRowContext = {
  /** The up and down arrows plus the drag handle, ready to render. */
  controls: ReactNode;
  index: number;
  itemCount: number;
};

export type ReorderMoveOptions = {
  /**
   * True for an arrow press, which is complete on its own. A drag's moves
   * arrive without it and finish with `onCommit`.
   */
  persist?: boolean;
};

type ReorderableListProps<Item> = {
  /** Wraps the rows, for a surface that draws its own list frame. */
  renderContainer?: (rows: ReactNode[]) => ReactNode;
  /** Disables dragging and the arrows, for example while saving. */
  disabled?: boolean;
  getKey: (item: Item) => string;
  /** Names an item for assistive technology (`Move <label> up`). */
  getLabel: (item: Item) => string;
  /** Adds the scroll position when the page scrolls under a drag. */
  getScrollOffsetY?: () => number;
  items: readonly Item[];
  /** Called once when a drag that moved something is released. */
  onCommit?: () => void;
  onDragActiveChange?: (isActive: boolean) => void;
  onDragMove?: (moveY: number) => void;
  /** Called for each one-slot move, for surfaces that update item by item. */
  onMove?: (from: number, to: number, options?: ReorderMoveOptions) => void;
  /** Called with the whole new order, for surfaces that own a plain list. */
  onReorder?: (next: Item[]) => void;
  renderItem: (item: Item, context: ReorderableRowContext) => ReactNode;
};

/**
 * A list the user can reorder by dragging a handle or with up and down arrows.
 * It owns the gestures and the controls; each surface keeps its own rows and
 * reports the order through `onMove` (per move) or `onReorder` (whole list).
 */
export const ReorderableList = <Item,>({
  renderContainer,
  disabled,
  getKey,
  getLabel,
  getScrollOffsetY,
  items,
  onCommit,
  onDragActiveChange,
  onDragMove,
  onMove,
  onReorder,
  renderItem,
}: ReorderableListProps<Item>) => {
  // Several moves can arrive in one drag event, before the parent re-renders,
  // so moves apply to a working copy that each render resets to the props.
  const workingRef = useRef<readonly Item[]>(items);

  workingRef.current = items;

  const handleMove = (
    from: number,
    to: number,
    options?: ReorderMoveOptions,
  ) => {
    workingRef.current = moveItem(workingRef.current, from, to);
    onMove?.(from, to, options);
    onReorder?.([...workingRef.current]);
  };

  const rows = items.map((item, index) => (
    <ReorderableRow
      disabled={disabled}
      getIndex={() =>
        workingRef.current.findIndex((entry) => getKey(entry) === getKey(item))
      }
      getScrollOffsetY={getScrollOffsetY}
      index={index}
      itemCount={items.length}
      key={getKey(item)}
      label={getLabel(item)}
      onCommit={onCommit}
      onDragActiveChange={onDragActiveChange}
      onDragMove={onDragMove}
      onMove={handleMove}
      renderRow={(context) => renderItem(item, context)}
    />
  ));

  return renderContainer ? renderContainer(rows) : <View>{rows}</View>;
};

const ReorderableRow = (props: {
  disabled?: boolean;
  getIndex: () => number;
  getScrollOffsetY?: () => number;
  index: number;
  itemCount: number;
  label: string;
  onCommit?: () => void;
  onDragActiveChange?: (isActive: boolean) => void;
  onDragMove?: (moveY: number) => void;
  onMove: (from: number, to: number, options?: ReorderMoveOptions) => void;
  renderRow: (context: ReorderableRowContext) => ReactNode;
}) => {
  const canDrag = props.itemCount > 1 && !props.disabled;
  const { onRowLayout, panHandlers } = useDragReorder({
    canDrag,
    getIndex: props.getIndex,
    getScrollOffsetY: props.getScrollOffsetY,
    itemCount: props.itemCount,
    onActiveChange: props.onDragActiveChange,
    onCommit: props.onCommit,
    onDragMove: props.onDragMove,
    onMove: props.onMove,
  });

  return (
    <View onLayout={(event) => onRowLayout(event.nativeEvent.layout.height)}>
      {props.renderRow({
        controls: (
          <ReorderControls
            canDrag={canDrag}
            disabled={props.disabled}
            index={props.index}
            itemCount={props.itemCount}
            label={props.label}
            onMove={(from, to) => props.onMove(from, to, { persist: true })}
            panHandlers={panHandlers}
          />
        ),
        index: props.index,
        itemCount: props.itemCount,
      })}
    </View>
  );
};
