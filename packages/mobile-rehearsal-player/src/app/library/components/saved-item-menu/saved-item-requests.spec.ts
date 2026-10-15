/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  requestSavedItemAction,
  resolveSavedItemShortcuts,
  subscribeToSavedItemRequests,
} from './saved-item-requests.js';

describe('saved item requests', () => {
  it('delivers a request to its subscribers until they leave', () => {
    const actions: string[] = [];
    const unsubscribe = subscribeToSavedItemRequests((request) => {
      actions.push(`${request.action}:${request.id}`);
    });

    requestSavedItemAction({ action: 'edit-tags', id: 'a', kind: 'track' });
    unsubscribe();
    requestSavedItemAction({ action: 'edit-tags', id: 'b', kind: 'track' });

    assert.deepEqual(actions, ['edit-tags:a']);
  });
});

describe('resolveSavedItemShortcuts', () => {
  it('offers nothing for an item that is not saved', () => {
    assert.deepEqual(
      resolveSavedItemShortcuts({
        hasLyrics: false,
        isSaved: false,
        item: { kind: 'track', sourceId: 'drive:a' },
      }),
      [],
    );
  });

  it('offers the library item actions for a saved track, including its loops', () => {
    const shortcuts = resolveSavedItemShortcuts({
      hasLyrics: false,
      isSaved: true,
      item: { kind: 'track', sourceId: 'drive:a' },
    });

    assert.deepEqual(
      shortcuts.map(({ id }) => id),
      [
        'add-to-playlist',
        'edit-tags',
        'edit-lyrics',
        'sheet-music',
        'make-loop',
        'view-track-loops',
        'remove-from-library',
      ],
    );
    assert.ok(shortcuts.every(({ request }) => request.id === 'drive:a'));
  });

  it('addresses a loop by its own id and swaps the track-only actions for editing the loop', () => {
    const shortcuts = resolveSavedItemShortcuts({
      hasLyrics: false,
      isSaved: true,
      item: { kind: 'loop', loopId: 'loop-1', sourceId: 'drive:a' },
    });

    assert.deepEqual(
      shortcuts.map(({ id }) => id),
      [
        'add-to-playlist',
        'edit-tags',
        'edit-lyrics',
        'sheet-music',
        'edit-loop',
        'remove-from-library',
      ],
    );
    assert.ok(
      shortcuts.every(
        ({ request }) => request.id === 'loop-1' && request.kind === 'loop',
      ),
    );
  });

  it('reads Edit lyrics once the owning track has lyrics, and Lyrics before', () => {
    const labelFor = (hasLyrics: boolean) =>
      resolveSavedItemShortcuts({
        hasLyrics,
        isSaved: true,
        item: { kind: 'track', sourceId: 'drive:a' },
      }).find(({ id }) => id === 'edit-lyrics')?.label;

    assert.equal(labelFor(false), 'Lyrics');
    assert.equal(labelFor(true), 'Edit lyrics');
  });
});

describe('the Sheet music shortcut', () => {
  it('always reads Sheet music and addresses the track or loop it was opened from', () => {
    const shortcutFor = (
      item: Parameters<typeof resolveSavedItemShortcuts>[0]['item'],
    ) =>
      resolveSavedItemShortcuts({ hasLyrics: true, isSaved: true, item }).find(
        ({ id }) => id === 'sheet-music',
      );

    assert.deepEqual(shortcutFor({ kind: 'track', sourceId: 'drive:a' }), {
      id: 'sheet-music',
      label: 'Sheet music',
      request: { action: 'sheet-music', id: 'drive:a', kind: 'track' },
    });
    assert.deepEqual(
      shortcutFor({ kind: 'loop', loopId: 'loop-1', sourceId: 'drive:a' })
        ?.request,
      { action: 'sheet-music', id: 'loop-1', kind: 'loop' },
    );
  });
});
