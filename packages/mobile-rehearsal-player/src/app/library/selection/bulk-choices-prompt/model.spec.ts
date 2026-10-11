import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_BULK_CHOICE_PREFERENCES } from '../bulk-choices.js';
import {
  DEFAULT_PROMPT_ANSWERS,
  getBulkChoicesPromptCopy,
  resolvePromptOutcome,
} from './model.js';

describe('getBulkChoicesPromptCopy', () => {
  it('states the playlist count with matching grammar and offers both answers', () => {
    const [one] = getBulkChoicesPromptCopy({
      dueQuestions: ['playlists'],
      playlistLinkCount: 1,
      repeatCount: 0,
    }).questions;
    const [many] = getBulkChoicesPromptCopy({
      dueQuestions: ['playlists'],
      playlistLinkCount: 3,
      repeatCount: 0,
    }).questions;

    assert.equal(one?.body, '1 playlist is in the selected folders.');
    assert.equal(many?.body, '3 playlists are in the selected folders.');
    assert.deepEqual(
      one?.options.map(({ label }) => label),
      ['Include playlists', 'Skip playlists'],
    );
  });

  it('states the repeat count and offers both answers', () => {
    const [question] = getBulkChoicesPromptCopy({
      dueQuestions: ['repeats'],
      playlistLinkCount: 0,
      repeatCount: 4,
    }).questions;

    assert.equal(question?.body, '4 items repeat.');
    assert.deepEqual(
      question?.options.map(({ label }) => label),
      ['Keep repeats', 'Remove repeats'],
    );
  });

  it('lists only the due questions, in the order given', () => {
    const { questions } = getBulkChoicesPromptCopy({
      dueQuestions: ['playlists', 'repeats'],
      playlistLinkCount: 2,
      repeatCount: 1,
    });

    assert.deepEqual(
      questions.map(({ question }) => question),
      ['playlists', 'repeats'],
    );
  });
});

describe('resolvePromptOutcome', () => {
  const base = {
    answers: { playlists: 'include', repeats: 'remove' } as const,
    decided: {},
    dueQuestions: ['playlists', 'repeats'] as const,
    preferences: DEFAULT_BULK_CHOICE_PREFERENCES,
  };

  it('uses the answers and stores nothing without Remember', () => {
    const outcome = resolvePromptOutcome({ ...base, remember: false });

    assert.deepEqual(outcome.expansionOptions, {
      playlists: 'include',
      repeats: 'remove',
    });
    assert.deepEqual(outcome.preferences, DEFAULT_BULK_CHOICE_PREFERENCES);
  });

  it('remembers every asked question when Remember is on', () => {
    const outcome = resolvePromptOutcome({ ...base, remember: true });

    assert.deepEqual(outcome.preferences, {
      playlistsInFolders: 'include',
      repeatedItems: 'remove',
    });
  });

  it('keeps a decided answer and never overwrites a question that was not asked', () => {
    const outcome = resolvePromptOutcome({
      ...base,
      decided: { playlists: 'skip' },
      dueQuestions: ['repeats'],
      preferences: { playlistsInFolders: 'skip', repeatedItems: 'ask' },
      remember: true,
    });

    assert.equal(outcome.expansionOptions.playlists, 'skip');
    assert.deepEqual(outcome.preferences, {
      playlistsInFolders: 'skip',
      repeatedItems: 'remove',
    });
  });

  it('starts on the behavior the app had before the prompt existed', () => {
    assert.deepEqual(DEFAULT_PROMPT_ANSWERS, {
      playlists: 'skip',
      repeats: 'keep',
    });
  });
});
