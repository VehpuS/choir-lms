import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AutoExportStatus } from '../../library/recording/export/auto-export-queue';
import type { AutoExportSettings } from '../../library/recording/export/auto-export-model';
import { DEFAULT_AUTO_EXPORT_SETTINGS } from '../../library/recording/export/auto-export-settings';
import { buildRecordingFixture } from '../../library/recording/recording-fixtures';
import {
  AUTO_EXPORT_COPY,
  buildAutoExportSettingsView,
  getBackUpConfirmation,
} from './recordings-auto-export-model';

const on: AutoExportSettings = {
  ...DEFAULT_AUTO_EXPORT_SETTINGS,
  eligibleFrom: '2026-11-03T00:00:00.000Z',
  enabled: true,
  folder: { folderId: 'f', folderName: 'Choir Recordings' },
};
const ready: AutoExportStatus = { gate: { state: 'ready' } };

const view = (
  overrides: Partial<Parameters<typeof buildAutoExportSettingsView>[0]> = {},
) =>
  buildAutoExportSettingsView({
    canTellConnectionType: false,
    folderState: { state: 'idle' },
    hasWriteAccess: true,
    recordings: [],
    settings: on,
    status: ready,
    ...overrides,
  });

describe('buildAutoExportSettingsView', () => {
  it('shows only the switch while it is off', () => {
    const off = view({ settings: DEFAULT_AUTO_EXPORT_SETTINGS });

    assert.equal(off.enabled, false);
    assert.equal(off.switchDetail, AUTO_EXPORT_COPY.switchOff);
    assert.equal(off.folder, undefined);
    assert.equal(off.allow, undefined);
  });

  it('drops the folder-creation note once a folder is chosen', () => {
    assert.equal(view().folder?.note, undefined);
  });

  it('asks for the permission while it is on without one, and shows the folder', () => {
    const missing = view({ hasWriteAccess: false });

    assert.equal(missing.allow?.label, 'Allow saving');
    assert.equal(missing.folder?.name, 'Choir Recordings');
    assert.equal(view().allow, undefined);
  });

  it('names the default folder before it exists, and says when it could not be made', () => {
    const none = view({ settings: { ...on, folder: undefined } });
    const failed = view({
      folderState: { reason: 'quota', state: 'failed' },
      settings: { ...on, folder: undefined },
    });

    assert.equal(none.folder?.name, 'Choir Recordings');
    assert.equal(none.folder?.note, AUTO_EXPORT_COPY.folderNote);
    assert.equal(none.folder?.isError, false);
    assert.equal(failed.folder?.isError, true);
    assert.match(failed.folder?.note ?? '', /out of storage/);
  });

  it('is honest about a browser that cannot tell Wi-Fi from mobile data', () => {
    assert.match(view().uploadOverNote, /cannot tell Wi-Fi from mobile data/);
    assert.equal(
      view({ canTellConnectionType: true }).uploadOverNote,
      AUTO_EXPORT_COPY.uploadOverWifiNote,
    );
    assert.equal(
      view({ settings: { ...on, uploadOver: 'any' } }).uploadOverNote,
      AUTO_EXPORT_COPY.uploadOverAnyNote,
    );
  });

  it('says what the queue is waiting for or doing', () => {
    assert.equal(
      view({ status: { gate: { reason: 'offline', state: 'held' } } })
        .statusNote,
      'Waiting for a connection.',
    );
    assert.equal(
      view({ status: { gate: { reason: 'cellular', state: 'held' } } })
        .statusNote,
      'Waiting for Wi-Fi.',
    );
    assert.equal(
      view({ status: { gate: { reason: 'no-session', state: 'held' } } })
        .statusNote,
      'Waiting for permission to save to Drive.',
    );
    assert.equal(
      view({
        status: {
          gate: { state: 'ready' },
          running: { kind: 'recording', progress: 0.62, recordingId: 'a' },
        },
      }).statusNote,
      'Uploading 62%',
    );
    assert.equal(view().statusNote, undefined);
  });

  it('counts the recordings Back up would add', () => {
    const old = buildRecordingFixture({
      createdAt: '2026-10-01T00:00:00.000Z',
      id: 'old',
    });
    const one = view({ recordings: [old] });
    const two = view({
      recordings: [
        old,
        buildRecordingFixture({
          createdAt: '2026-09-01T00:00:00.000Z',
          id: 'older',
        }),
      ],
    });

    assert.equal(one.backUp.count, 1);
    assert.equal(one.backUp.detail, '1 recording is not on Drive yet.');
    assert.equal(two.backUp.detail, '2 recordings are not on Drive yet.');
    assert.equal(view().backUp.detail, AUTO_EXPORT_COPY.backUpNone);
  });

  it('sizes the back-up and says what the confirmation will do', () => {
    const old = buildRecordingFixture({
      createdAt: '2026-10-01T00:00:00.000Z',
      id: 'old',
      sizeBytes: 2_097_152,
    });
    const { backUp } = view({ recordings: [old] });
    const confirmation = getBackUpConfirmation(backUp);

    assert.equal(backUp.sizeBytes, 2_097_152);
    assert.ok(confirmation.message.startsWith('1 recording (2.0 MB)'));
    assert.ok(confirmation.message.includes('Turning auto-export off pauses'));
  });
});
