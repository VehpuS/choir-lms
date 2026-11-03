import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildRecordingFixture } from '../recording-fixtures';
import type { AutoExportSettings } from './auto-export-model';
import {
  DEFAULT_AUTO_EXPORT_SETTINGS,
  applyAutoExportChange,
  countRecordingsToBackUp,
  parseAutoExportSettings,
} from './auto-export-settings';
import { createAutoExportSettingsStore } from './auto-export-settings-store';

const NOW = new Date('2026-11-03T10:00:00.000Z');
const LATER = new Date('2026-11-04T10:00:00.000Z');
const FOLDER = { folderId: 'f1', folderName: 'Choir Recordings' };
const on: AutoExportSettings = {
  ...DEFAULT_AUTO_EXPORT_SETTINGS,
  eligibleFrom: NOW.toISOString(),
  enabled: true,
  folder: FOLDER,
};

describe('applyAutoExportChange', () => {
  it('starts off, recording only, over Wi-Fi only', () => {
    assert.deepEqual(DEFAULT_AUTO_EXPORT_SETTINGS, {
      eligibleFrom: null,
      enabled: false,
      uploadOver: 'wifi',
      what: 'recording',
    });
  });

  it('turning it on applies from that moment, not to the past', () => {
    const next = applyAutoExportChange(
      DEFAULT_AUTO_EXPORT_SETTINGS,
      { type: 'enable' },
      NOW,
    );

    assert.equal(next.enabled, true);
    assert.equal(next.eligibleFrom, NOW.toISOString());
  });

  it('turning it on again, or off, leaves the start alone', () => {
    assert.equal(applyAutoExportChange(on, { type: 'enable' }, LATER), on);
    assert.equal(
      applyAutoExportChange(on, { type: 'disable' }, LATER).eligibleFrom,
      NOW.toISOString(),
    );
  });

  it('changing what is exported, or the folder, applies to new recordings only', () => {
    const what = applyAutoExportChange(
      on,
      { type: 'set-what', what: 'both' },
      LATER,
    );
    const folder = applyAutoExportChange(
      on,
      { folder: { folderId: 'f2', folderName: 'Other' }, type: 'set-folder' },
      LATER,
    );

    assert.equal(what.what, 'both');
    assert.equal(what.eligibleFrom, LATER.toISOString());
    assert.equal(folder.folder?.folderId, 'f2');
    assert.equal(folder.eligibleFrom, LATER.toISOString());
  });

  it('choosing what is already chosen changes nothing', () => {
    assert.equal(
      applyAutoExportChange(on, { type: 'set-what', what: 'recording' }, LATER),
      on,
    );
    assert.equal(
      applyAutoExportChange(on, { folder: FOLDER, type: 'set-folder' }, LATER),
      on,
    );
  });

  it('Upload over does not move the start, and Back up existing recordings reaches back', () => {
    assert.equal(
      applyAutoExportChange(
        on,
        { type: 'set-upload-over', uploadOver: 'any' },
        LATER,
      ).eligibleFrom,
      NOW.toISOString(),
    );
    assert.equal(
      applyAutoExportChange(on, { type: 'back-up-existing' }, LATER)
        .eligibleFrom,
      null,
    );
  });
});

describe('parseAutoExportSettings', () => {
  it('reads a saved value', () => {
    assert.deepEqual(parseAutoExportSettings({ ...on }), on);
  });

  it('falls back field by field for anything unreadable', () => {
    assert.deepEqual(
      parseAutoExportSettings(null),
      DEFAULT_AUTO_EXPORT_SETTINGS,
    );
    assert.deepEqual(
      parseAutoExportSettings({
        enabled: 'yes',
        folder: { folderId: 1 },
        uploadOver: 'fast',
        what: 'all',
      }),
      DEFAULT_AUTO_EXPORT_SETTINGS,
    );
  });
});

describe('countRecordingsToBackUp', () => {
  const made = (
    id: string,
    createdAt: string,
    exports?: ReturnType<typeof buildRecordingFixture>['exports'],
  ) => buildRecordingFixture({ createdAt, exports, id });

  it('counts the earlier recordings the setting would export but leaves alone', () => {
    const recordings = [
      made('old', '2026-10-01T00:00:00.000Z'),
      made('older-on-drive', '2026-09-01T00:00:00.000Z', {
        done: [
          {
            driveFileId: 'x',
            exportedAt: '',
            fileName: '',
            folderId: '',
            folderName: '',
            kind: 'recording',
          },
        ],
        failed: [],
      }),
      made('new', '2026-11-03T12:00:00.000Z'),
    ];

    assert.equal(countRecordingsToBackUp(recordings, on), 1);
  });

  it('is zero once every recording is eligible', () => {
    assert.equal(
      countRecordingsToBackUp([made('old', '2026-10-01T00:00:00.000Z')], {
        ...on,
        eligibleFrom: null,
      }),
      0,
    );
  });
});

describe('createAutoExportSettingsStore', () => {
  const memory = (initial: Record<string, string> = {}) => {
    const data = { ...initial };

    return {
      data,
      storage: {
        getItem: async (key: string) => data[key] ?? null,
        setItem: async (key: string, value: string) => {
          data[key] = value;
        },
      },
    };
  };

  it('saves a change and restores it in a new store', async () => {
    const m = memory();
    const first = createAutoExportSettingsStore(m.storage as never);

    await first.change({ type: 'enable' }, NOW);
    await first.change({ folder: FOLDER, type: 'set-folder' }, NOW);

    const second = createAutoExportSettingsStore(m.storage as never);

    await second.restore();
    assert.deepEqual(second.get(), first.get());
    assert.equal(second.get().enabled, true);
  });

  it('keeps a change made while the saved value was still loading', async () => {
    const m = memory({
      'choirlms.recording-export.settings': JSON.stringify({
        ...on,
        enabled: false,
      }),
    });
    const store = createAutoExportSettingsStore(m.storage as never);

    await store.change({ type: 'enable' }, LATER);
    await store.restore();

    assert.equal(store.get().enabled, true);
  });

  it('tells subscribers of a change, and not of a no-op', async () => {
    const store = createAutoExportSettingsStore(memory().storage as never);
    let calls = 0;

    store.subscribe(() => {
      calls += 1;
    });
    await store.change({ type: 'enable' }, NOW);
    await store.change({ type: 'enable' }, LATER);

    assert.equal(calls, 1);
  });
});
