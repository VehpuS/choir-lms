import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DeviceFileCheck } from './device-file-model.js';
import {
  createSaveFlow,
  describeSaveFailure,
  reduceSaveFlow,
  type SaveFlowEvent,
  type SaveFlowFailure,
  type SaveFlowState,
} from './save-flow-model.js';

const ACCEPTED: DeviceFileCheck = {
  bytes: new Uint8Array([1]),
  format: 'pdf',
  mimeType: 'application/pdf',
  name: 'Kyrie.pdf',
  status: 'accepted',
};
const TARGET = { folderId: 'folder-1', folderName: 'Scores' };

const run = (start: SaveFlowState, ...events: SaveFlowEvent[]) =>
  events.reduce(reduceSaveFlow, start);

const toFolder = () =>
  run(createSaveFlow('link'), { check: ACCEPTED, type: 'file-checked' });
const toUploading = () =>
  run(toFolder(), { target: TARGET, type: 'folder-chosen' });

describe('save flow steps', () => {
  it('starts at the file step, remembers the link was opened, and moves on with an accepted file', () => {
    const opened = run(createSaveFlow('link'), { type: 'link-opened' });

    assert.equal(opened.step, 'file');
    assert.equal(opened.hasOpenedLink, true);

    const next = run(opened, { check: ACCEPTED, type: 'file-checked' });

    assert.equal(next.step, 'folder');
    assert.equal(next.file?.name, 'Kyrie.pdf');
    assert.equal(next.hasOpenedLink, true);
  });

  it('stays on the file step with the reason when the file is refused', () => {
    const state = run(createSaveFlow('device'), {
      check: { reason: 'html-page', status: 'refused' },
      type: 'file-checked',
    });

    assert.equal(state.step, 'file');
    assert.equal(state.refusal, 'html-page');
    assert.equal(state.file, undefined);
  });

  it('clears an earlier refusal once a good file is chosen', () => {
    const state = run(
      createSaveFlow('device'),
      {
        check: { reason: 'too-large', status: 'refused' },
        type: 'file-checked',
      },
      { check: ACCEPTED, type: 'file-checked' },
    );

    assert.equal(state.refusal, undefined);
    assert.equal(state.step, 'folder');
  });

  it('uploads into the chosen folder and ends saved', () => {
    const uploading = toUploading();

    assert.equal(uploading.step, 'uploading');
    assert.deepEqual(uploading.target, TARGET);
    assert.equal(
      run(uploading, {
        result: { file: { id: 'new', name: 'Kyrie.pdf' }, status: 'uploaded' },
        type: 'upload-finished',
      }).step,
      'saved',
    );
  });

  it('goes back to the folder step on a cancel, keeping the chosen file', () => {
    const state = run(toUploading(), {
      result: { status: 'aborted' },
      type: 'upload-finished',
    });

    assert.equal(state.step, 'folder');
    assert.equal(state.file?.name, 'Kyrie.pdf');
  });

  it('keeps the file and folder on a failure, so a retry repeats only the upload', () => {
    const failed = run(toUploading(), {
      result: { reason: 'offline', status: 'failed' },
      type: 'upload-finished',
    });

    assert.equal(failed.step, 'failed');
    assert.equal(failed.failure, 'offline');

    const retried = run(failed, { type: 'retry' });

    assert.equal(retried.step, 'uploading');
    assert.equal(retried.failure, undefined);
    assert.deepEqual(retried.target, TARGET);
  });

  it('lets a failure return to the folder step or the file step', () => {
    const failed = run(toUploading(), {
      result: { reason: 'folder-not-writable', status: 'failed' },
      type: 'upload-finished',
    });

    assert.equal(run(failed, { type: 'change-folder' }).step, 'folder');
    assert.equal(run(failed, { type: 'change-file' }).file, undefined);
  });

  it('says so when the track link was removed while the file saved', () => {
    const saved = run(toUploading(), {
      result: { file: { id: 'new', name: 'Kyrie.pdf' }, status: 'uploaded' },
      type: 'upload-finished',
    });

    assert.equal(
      run(saved, { outcome: 'source-removed', type: 'link-resolved' })
        .sourceRemoved,
      true,
    );
    assert.equal(
      run(saved, { outcome: 'linked', type: 'link-resolved' }),
      saved,
    );
    assert.equal(
      run(saved, { outcome: 'failed', type: 'link-resolved' }).failure,
      'not-linked',
    );
  });

  it('ignores events that do not fit the current step', () => {
    const start = createSaveFlow('link');

    assert.equal(run(start, { target: TARGET, type: 'folder-chosen' }), start);
    assert.equal(run(start, { type: 'retry' }), start);
    const atFolder = toFolder();

    assert.equal(
      run(atFolder, { check: ACCEPTED, type: 'file-checked' }),
      atFolder,
    );
  });
});

describe('describeSaveFailure', () => {
  it('has a title, message, and next step for every failure', () => {
    const failures: SaveFlowFailure[] = [
      'needs-write-access',
      'quota',
      'folder-not-writable',
      'offline',
      'too-large',
      'unavailable',
      'not-linked',
    ];

    for (const failure of failures) {
      const copy = describeSaveFailure(failure);

      assert.ok(copy.title && copy.message && copy.actionLabel, failure);
    }
  });

  it('sends a missing permission back to Allow saving and a bad folder back to the picker', () => {
    assert.equal(
      describeSaveFailure('needs-write-access').action,
      'allow-saving',
    );
    assert.equal(
      describeSaveFailure('folder-not-writable').action,
      'change-folder',
    );
    assert.equal(describeSaveFailure('offline').action, 'retry');
  });
});
