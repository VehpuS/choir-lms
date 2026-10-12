import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LyricsCandidate } from '../../lyrics-lookup-client.js';
import {
  MAX_LYRICS_LENGTH,
  canSaveLyrics,
  createLyricsEditorState,
  formatCandidateLengthDifference,
  getLyricsAttribution,
  getLyricsCharacterCountLabel,
  getLyricsLookupFailureMessage,
  hasStoredLyrics,
  hasUnsavedLyricsEdits,
  lyricsEditorReducer,
  type LyricsEditorAction,
  type LyricsEditorState,
} from './model.js';

const CANDIDATE: LyricsCandidate = {
  title: 'Mezmerize',
  artist: 'System of a Down',
  durationMs: 237_000,
  plainLyrics: 'Looked up words',
};

const openEmpty = (hasAcknowledgedDisclosure = false) =>
  createLyricsEditorState({
    hasAcknowledgedDisclosure,
    lyrics: undefined,
    trackName: '04_Mezmerize.mp3',
  });

const run = (state: LyricsEditorState, ...actions: LyricsEditorAction[]) =>
  actions.reduce(lyricsEditorReducer, state);

describe('opening the editor', () => {
  it('pre-fills the title, leaves the artist empty, and sends nothing', () => {
    const state = openEmpty();

    assert.equal(state.title, 'Mezmerize');
    assert.equal(state.artist, '');
    assert.deepEqual(state.lookup, { status: 'idle' });
  });

  it('opens with stored lyrics and treats them as saved', () => {
    const state = createLyricsEditorState({
      hasAcknowledgedDisclosure: true,
      lyrics: { text: 'Kyrie', updatedAt: 'now', origin: 'looked-up' },
      trackName: 'Kyrie.mp3',
    });

    assert.equal(state.text, 'Kyrie');
    assert.equal(hasStoredLyrics(state), true);
    assert.equal(hasUnsavedLyricsEdits(state), false);
    assert.equal(canSaveLyrics(state), false);
  });
});

describe('typing and saving', () => {
  it('allows saving typed text and marks it as typed', () => {
    const state = run(openEmpty(), { type: 'text-changed', text: 'Words' });

    assert.equal(canSaveLyrics(state), true);
    assert.equal(state.origin, 'typed');
  });

  it('treats whitespace-only changes as no edit', () => {
    const state = run(openEmpty(), { type: 'text-changed', text: '  \n ' });

    assert.equal(hasUnsavedLyricsEdits(state), false);
  });

  it('refuses text over the limit and shows the count', () => {
    const state = run(openEmpty(), {
      type: 'text-changed',
      text: 'a'.repeat(MAX_LYRICS_LENGTH + 1),
    });

    assert.equal(canSaveLyrics(state), false);
    assert.equal(getLyricsCharacterCountLabel(state), '20,001 / 20,000');
  });

  it('allows clearing stored lyrics so Save removes them', () => {
    const stored = createLyricsEditorState({
      hasAcknowledgedDisclosure: true,
      lyrics: { text: 'Words', updatedAt: 'now', origin: 'typed' },
      trackName: 'x.mp3',
    });

    assert.equal(
      canSaveLyrics(run(stored, { type: 'text-changed', text: '' })),
      true,
    );
  });
});

describe('looking up', () => {
  it('asks for acknowledgement before the first lookup', () => {
    const asked = run(openEmpty(), { type: 'lookup-requested' });

    assert.deepEqual(asked.lookup, { status: 'disclosing' });

    const acknowledged = run(asked, { type: 'disclosure-acknowledged' });

    assert.deepEqual(acknowledged.lookup, { status: 'loading' });
    assert.equal(acknowledged.hasAcknowledgedDisclosure, true);
  });

  it('skips the disclosure once acknowledged on this device', () => {
    const state = run(openEmpty(true), { type: 'lookup-requested' });

    assert.deepEqual(state.lookup, { status: 'loading' });
  });

  it('loads a chosen candidate for review without counting it as saved', () => {
    const state = run(
      openEmpty(true),
      { type: 'lookup-requested' },
      { type: 'lookup-succeeded', candidates: [CANDIDATE] },
      { type: 'candidate-chosen', candidate: CANDIDATE },
    );

    assert.equal(state.text, 'Looked up words');
    assert.equal(state.origin, 'looked-up');
    assert.equal(state.initialText, '');
    assert.equal(canSaveLyrics(state), true);
    assert.ok(getLyricsAttribution(state));
  });

  it('flips looked-up text to typed once the user edits it', () => {
    const state = run(
      openEmpty(true),
      { type: 'candidate-chosen', candidate: CANDIDATE },
      { type: 'text-changed', text: 'Looked up words, fixed' },
    );

    assert.equal(state.origin, 'typed');
    assert.equal(getLyricsAttribution(state), null);
  });

  it('keeps entered text and fields when a lookup fails', () => {
    const state = run(
      openEmpty(true),
      { type: 'text-changed', text: 'Mine' },
      { type: 'artist-changed', artist: 'Someone' },
      { type: 'lookup-requested' },
      { type: 'lookup-failed', reason: 'offline' },
    );

    assert.deepEqual(state.lookup, { status: 'failed', reason: 'offline' });
    assert.equal(state.text, 'Mine');
    assert.equal(state.artist, 'Someone');
  });

  it('returns to idle when the lookup was cancelled', () => {
    const state = run(
      openEmpty(true),
      { type: 'lookup-requested' },
      { type: 'lookup-failed', reason: 'aborted' },
    );

    assert.deepEqual(state.lookup, { status: 'idle' });
  });

  it('has a message for every failure the user can see', () => {
    for (const reason of [
      'no-results',
      'offline',
      'rate-limited',
      'unavailable',
    ] as const) {
      assert.ok(getLyricsLookupFailureMessage(reason).length > 0);
    }
  });
});

describe('formatCandidateLengthDifference', () => {
  it('shows signed seconds, or same length', () => {
    assert.equal(formatCandidateLengthDifference(240_000, 237_000), '+3 s');
    assert.equal(formatCandidateLengthDifference(225_000, 237_000), '−12 s');
    assert.equal(
      formatCandidateLengthDifference(237_400, 237_000),
      'same length',
    );
  });

  it('omits the difference when either length is unknown', () => {
    assert.equal(formatCandidateLengthDifference(undefined, 237_000), null);
    assert.equal(formatCandidateLengthDifference(237_000, undefined), null);
  });
});
