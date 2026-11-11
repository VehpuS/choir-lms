import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getPlaybackTabs,
  getPlaybackTabTarget,
  getSelectedPlaybackTab,
} from './playback-tabs-model';

const keysOf = (options: { hasQueue: boolean; isComposite: boolean }) =>
  getPlaybackTabs(options).map((tab) => tab.key);

describe('getPlaybackTabs', () => {
  it('offers Lyrics and Speed & pitch for a standalone track', () => {
    assert.deepEqual(keysOf({ hasQueue: false, isComposite: false }), [
      'lyrics',
      'shaping',
    ]);
  });

  it('adds Queue when the item has queue navigation', () => {
    assert.deepEqual(keysOf({ hasQueue: true, isComposite: false }), [
      'lyrics',
      'queue',
      'shaping',
    ]);
  });

  it('adds Mix for a composite, before Queue', () => {
    assert.deepEqual(keysOf({ hasQueue: true, isComposite: true }), [
      'lyrics',
      'mix',
      'queue',
      'shaping',
    ]);
  });

  it('names the tabs as the compact sheet does', () => {
    const labels = getPlaybackTabs({ hasQueue: true, isComposite: true }).map(
      (tab) => tab.label,
    );

    assert.deepEqual(labels, ['Lyrics', 'Mix', 'Queue', 'Speed & pitch']);
  });
});

describe('getSelectedPlaybackTab', () => {
  const tabs = getPlaybackTabs({ hasQueue: true, isComposite: true });

  it('follows the queue and shaping surfaces', () => {
    assert.equal(
      getSelectedPlaybackTab({
        nowPlayingTab: 'lyrics',
        surface: 'queue',
        tabs,
      }),
      'queue',
    );
    assert.equal(
      getSelectedPlaybackTab({
        nowPlayingTab: 'mix',
        surface: 'shaping',
        tabs,
      }),
      'shaping',
    );
  });

  it('shows the remembered Lyrics or Mix choice on the now-playing surface', () => {
    assert.equal(
      getSelectedPlaybackTab({
        nowPlayingTab: 'mix',
        surface: 'now-playing',
        tabs,
      }),
      'mix',
    );
    assert.equal(
      getSelectedPlaybackTab({
        nowPlayingTab: 'lyrics',
        surface: 'now-playing',
        tabs,
      }),
      'lyrics',
    );
  });

  it('falls back to Lyrics when the chosen tab no longer exists', () => {
    const standalone = getPlaybackTabs({ hasQueue: false, isComposite: false });

    assert.equal(
      getSelectedPlaybackTab({
        nowPlayingTab: 'mix',
        surface: 'now-playing',
        tabs: standalone,
      }),
      'lyrics',
    );
    assert.equal(
      getSelectedPlaybackTab({
        nowPlayingTab: 'lyrics',
        surface: 'queue',
        tabs: standalone,
      }),
      'lyrics',
    );
  });
});

describe('getPlaybackTabTarget', () => {
  it('sends Queue and Speed & pitch to their own surfaces', () => {
    assert.deepEqual(getPlaybackTabTarget('queue'), {
      nowPlayingTab: null,
      surface: 'queue',
    });
    assert.deepEqual(getPlaybackTabTarget('shaping'), {
      nowPlayingTab: null,
      surface: 'shaping',
    });
  });

  it('keeps Lyrics and Mix on the now-playing surface and says which', () => {
    assert.deepEqual(getPlaybackTabTarget('lyrics'), {
      nowPlayingTab: 'lyrics',
      surface: 'now-playing',
    });
    assert.deepEqual(getPlaybackTabTarget('mix'), {
      nowPlayingTab: 'mix',
      surface: 'now-playing',
    });
  });
});
