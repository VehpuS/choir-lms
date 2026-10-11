import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findSentenceCaseViolations } from './copy-casing';

describe('findSentenceCaseViolations', () => {
  it('accepts sentence case, with the first word of each sentence capitalized', () => {
    assert.deepEqual(findSentenceCaseViolations('Remove from library'), []);
    assert.deepEqual(
      findSentenceCaseViolations('Nothing saved yet. Start in Add or Recents.'),
      [],
    );
    assert.deepEqual(
      findSentenceCaseViolations('Library files unavailable'),
      [],
    );
  });

  it('flags every capitalized word after the first', () => {
    assert.deepEqual(findSentenceCaseViolations('Edit Selection'), [
      'Selection',
    ]);
    assert.deepEqual(findSentenceCaseViolations('Loading Files'), ['Files']);
    assert.deepEqual(findSentenceCaseViolations('Up Next Order'), [
      'Next',
      'Order',
    ]);
  });

  it('treats Library as a generic noun that is capitalized only first', () => {
    assert.deepEqual(findSentenceCaseViolations('Save to Library'), [
      'Library',
    ]);
    assert.deepEqual(findSentenceCaseViolations('Library Files unavailable'), [
      'Files',
    ]);
    assert.deepEqual(findSentenceCaseViolations('Open the library'), []);
  });

  it('keeps Google and the Add and Recents destinations capitalized', () => {
    assert.deepEqual(findSentenceCaseViolations('Show in Add'), []);
    assert.deepEqual(findSentenceCaseViolations('Connect Google Drive.'), []);
    assert.deepEqual(findSentenceCaseViolations('Search in My Drive'), []);
    assert.deepEqual(findSentenceCaseViolations('Search in Shared folders'), [
      'Shared',
    ]);
  });

  it('leaves quoted labels, user names, file names and code names alone', () => {
    assert.deepEqual(
      findSentenceCaseViolations('Choose "Make loop" on a saved track.'),
      [],
    );
    assert.deepEqual(
      findSentenceCaseViolations('Saved “Full Choir” to your library.'),
      [],
    );
    assert.deepEqual(
      findSentenceCaseViolations('Move ${source.name} to Choir.mp3'),
      [],
    );
    assert.deepEqual(
      findSentenceCaseViolations('The native TrackPlayer module failed.'),
      [],
    );
  });

  it('restarts the rule at each sentence', () => {
    assert.deepEqual(
      findSentenceCaseViolations('Saved. Open the queue. Close It.'),
      ['It'],
    );
  });
});
