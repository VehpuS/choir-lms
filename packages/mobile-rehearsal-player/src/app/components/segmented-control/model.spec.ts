/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appTheme } from '../../utils/theme.js';
import {
  SEGMENTED_CONTROL_MIN_HEIGHT,
  resolveSegmentCornerRadii,
  resolveSegmentedControlRadius,
  resolveSegmentedControlSegments,
} from './model.js';

const { colors } = appTheme;

describe('SegmentedControl', () => {
  it('outlines only the selected segment in the accent with accent text', () => {
    const segments = resolveSegmentedControlSegments(
      [
        { label: 'This folder', value: 'current-folder' },
        { label: 'All Files', value: 'all-files' },
      ],
      'all-files',
    );

    assert.deepEqual(
      segments.map((segment) => [
        segment.value,
        segment.isSelected,
        segment.borderColor,
        segment.labelColor,
      ]),
      [
        ['current-folder', false, colors.transparent, colors.textMuted],
        ['all-files', true, colors.accent, colors.accentText],
      ],
    );
  });

  it('uses an option accessibility label when given, else the visible label', () => {
    const segments = resolveSegmentedControlSegments(
      [
        {
          accessibilityLabel: 'Match any selected tag',
          label: 'Any',
          value: 'any',
        },
        { label: 'All', value: 'all' },
      ],
      'all',
    );

    assert.deepEqual(
      segments.map((segment) => segment.accessibilityLabel),
      ['Match any selected tag', 'All'],
    );
  });

  it('keeps segments at the 44pt minimum and rounds pills fully', () => {
    assert.equal(SEGMENTED_CONTROL_MIN_HEIGHT, 44);
    assert.equal(resolveSegmentedControlRadius('group'), appTheme.radius.md);
    assert.equal(resolveSegmentedControlRadius('pill'), appTheme.radius.pill);
  });

  it('rounds only the outer corners so inner segment edges stay square', () => {
    assert.deepEqual(
      resolveSegmentCornerRadii({ count: 2, index: 0, radius: 8 }),
      {
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 0,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 0,
      },
    );
    assert.deepEqual(
      resolveSegmentCornerRadii({ count: 3, index: 1, radius: 8 }),
      {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      },
    );
    assert.deepEqual(
      resolveSegmentCornerRadii({ count: 2, index: 1, radius: 8 }),
      {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 8,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 8,
      },
    );
  });
});
