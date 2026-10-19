import { useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { appTheme } from '../../utils/theme';
import { moveItem } from './reorder-model';
import { ReorderControls } from './reorder-controls';
import { useDragReorder } from './use-drag-reorder';

type ReorderableListProps<Item> = {
  /** Disables dragging and the arrows, for example while saving. */
  disabled?: boolean;
  getKey: (item: Item) => string;
  /** Names an item for assistive technology (`Move <label> up`). */
  getLabel: (item: Item) => string;
  items: readonly Item[];
  onChange: (next: Item[]) => void;
  onDragActiveChange?: (isActive: boolean) => void;
  /** The row's content, to the left of the reorder controls. */
  renderContent: (item: Item, index: number) => ReactNode;
  /** Extra controls after the reorder controls, such as a remove button. */
  renderTrailing?: (item: Item, index: number) => ReactNode;
};

/**
 * A short list the user can reorder by dragging a handle or with up and down
 * arrows. Owns no data: it reports the new order through `onChange`.
 */
export const ReorderableList = <Item,>({
  disabled,
  getKey,
  getLabel,
  items,
  onChange,
  onDragActiveChange,
  renderContent,
  renderTrailing,
}: ReorderableListProps<Item>) => {
  // Several moves can arrive in one drag event, before the parent re-renders,
  // so moves apply to a working copy that each render resets to the props.
  const workingRef = useRef<readonly Item[]>(items);

  workingRef.current = items;

  const handleMove = (from: number, to: number) => {
    workingRef.current = moveItem(workingRef.current, from, to);
    onChange([...workingRef.current]);
  };

  return (
    <View>
      {items.map((item, index) => (
        <ReorderableRow
          disabled={disabled}
          getIndex={() =>
            workingRef.current.findIndex(
              (entry) => getKey(entry) === getKey(item),
            )
          }
          index={index}
          isLast={index === items.length - 1}
          itemCount={items.length}
          key={getKey(item)}
          label={getLabel(item)}
          onDragActiveChange={onDragActiveChange}
          onMove={handleMove}
        >
          {renderContent(item, index)}
          {renderTrailing?.(item, index)}
        </ReorderableRow>
      ))}
    </View>
  );
};

const ReorderableRow = (props: {
  children: [ReactNode, ReactNode];
  disabled?: boolean;
  getIndex: () => number;
  index: number;
  isLast: boolean;
  itemCount: number;
  label: string;
  onDragActiveChange?: (isActive: boolean) => void;
  onMove: (from: number, to: number) => void;
}) => {
  const canDrag = props.itemCount > 1 && !props.disabled;
  const { onRowLayout, panHandlers } = useDragReorder({
    canDrag,
    getIndex: props.getIndex,
    itemCount: props.itemCount,
    onActiveChange: props.onDragActiveChange,
    onMove: props.onMove,
  });

  return (
    <View
      onLayout={(event) => onRowLayout(event.nativeEvent.layout.height)}
      style={[styles.row, props.isLast ? undefined : styles.rowSeparated]}
    >
      <View style={styles.content}>{props.children[0]}</View>
      <ReorderControls
        canDrag={canDrag}
        disabled={props.disabled}
        index={props.index}
        itemCount={props.itemCount}
        label={props.label}
        onMove={props.onMove}
        panHandlers={panHandlers}
      />
      {props.children[1]}
    </View>
  );
};

const styles = StyleSheet.create({
  content: { flex: 1, minWidth: 0 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: appTheme.space.sm,
    paddingVertical: appTheme.space.xs,
  },
  rowSeparated: {
    borderBottomColor: appTheme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
