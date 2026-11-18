import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isListeningOwnerId,
  LISTENING_STEM_ID,
  listeningOwnerId,
  listeningPreparedKey,
  trackIdOfListeningOwner,
} from './prepared-owner';

describe('prepared owner ids', () => {
  it('gives a single track its own owner id and reads the track back', () => {
    const ownerId = listeningOwnerId('drive-file-1');

    assert.equal(isListeningOwnerId(ownerId), true);
    assert.equal(trackIdOfListeningOwner(ownerId), 'drive-file-1');
  });

  it('does not take a composite id for a track', () => {
    assert.equal(isListeningOwnerId('composite-1'), false);
    assert.equal(trackIdOfListeningOwner('composite-1'), null);
  });

  it('keys a track by its owner id, the one stem and the version of its audio', () => {
    assert.deepEqual(listeningPreparedKey({ id: 't1', version: 'v2' }), {
      compositeId: listeningOwnerId('t1'),
      stemId: LISTENING_STEM_ID,
      contentVersion: 'v2',
    });
  });
});
