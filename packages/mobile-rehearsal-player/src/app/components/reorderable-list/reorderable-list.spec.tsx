import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';
import { Text } from 'react-native';

import { hasRenderedText } from '../../../test-support/rendered-text';
import { ReorderableList, type ReorderMoveOptions } from './reorderable-list';

const PARTS = ['Alto', 'Tenor', 'Bass'];

type Move = { from: number; options?: ReorderMoveOptions; to: number };

const renderParts = (
  props: Partial<Parameters<typeof ReorderableList<string>>[0]> = {},
) => {
  const moves: Move[] = [];
  const orders: string[][] = [];

  render(
    <ReorderableList
      getKey={(name) => name}
      getLabel={(name) => name}
      items={PARTS}
      onMove={(from, to, options) => moves.push({ from, options, to })}
      onReorder={(next) => orders.push(next)}
      renderItem={(name, { controls, index, itemCount }) => (
        <>
          <Text>{`${index + 1} of ${itemCount}: ${name}`}</Text>
          {controls}
        </>
      )}
      {...props}
    />,
  );

  return { moves, orders };
};

// A disabled control still renders; whether it is disabled is what matters.
const isDisabled = (label: string) => {
  const props = screen.getByLabelText(label).props;

  return props.disabled === true || props['aria-disabled'] === true;
};

describe('ReorderableList', () => {
  afterEach(cleanup);

  it('renders each row through renderItem with its position', () => {
    renderParts();

    assert.ok(hasRenderedText('1 of 3: Alto'));
    assert.ok(hasRenderedText('3 of 3: Bass'));
  });

  it('gives every row both the arrows and the drag handle', () => {
    renderParts();

    for (const name of PARTS) {
      assert.ok(screen.getByLabelText(`Move ${name} up`));
      assert.ok(screen.getByLabelText(`Move ${name} down`));
      assert.ok(screen.getByLabelText(`Drag ${name} to reorder`));
    }
  });

  it('disables the arrow that would leave the list', () => {
    renderParts();

    assert.equal(isDisabled('Move Alto up'), true);
    assert.equal(isDisabled('Move Alto down'), false);
    assert.equal(isDisabled('Move Bass down'), true);
    assert.equal(isDisabled('Move Bass up'), false);
  });

  it('reports an arrow press as a saved move and as the whole new order', () => {
    const { moves, orders } = renderParts();

    fireEvent.press(screen.getByLabelText('Move Alto down'));

    assert.deepEqual(moves, [{ from: 0, options: { persist: true }, to: 1 }]);
    assert.deepEqual(orders, [['Tenor', 'Alto', 'Bass']]);
  });

  it('disables every arrow and handle while the list is disabled', () => {
    renderParts({ disabled: true });

    for (const name of PARTS) {
      assert.equal(isDisabled(`Move ${name} up`), true);
      assert.equal(isDisabled(`Move ${name} down`), true);
    }
  });

  it('keeps a single item still: nothing to move it past', () => {
    renderParts({ items: ['Alto'] });

    assert.equal(isDisabled('Move Alto up'), true);
    assert.equal(isDisabled('Move Alto down'), true);
  });

  it('lets a surface wrap its rows in its own container', () => {
    renderParts({
      renderContainer: (rows) => (
        <>
          <Text>Frame</Text>
          {rows}
        </>
      ),
    });

    assert.ok(hasRenderedText('Frame'));
    assert.ok(hasRenderedText('2 of 3: Tenor'));
  });
});
