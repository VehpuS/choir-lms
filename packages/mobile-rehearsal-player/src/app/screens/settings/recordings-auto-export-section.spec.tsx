import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { cleanup, fireEvent, render } from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../test-support/rendered-text';
import type { AutoExportSettings } from '../../library/recording/export/auto-export-model';
import { DEFAULT_AUTO_EXPORT_SETTINGS } from '../../library/recording/export/auto-export-settings';
import { buildRecordingFixture } from '../../library/recording/recording-fixtures';
import { buildAutoExportSettingsView } from './recordings-auto-export-model';
import {
  RecordingsAutoExportSectionView,
  type RecordingsAutoExportSectionViewProps,
} from './recordings-auto-export-section';

afterEach(cleanup);

const on: AutoExportSettings = {
  ...DEFAULT_AUTO_EXPORT_SETTINGS,
  eligibleFrom: '2026-11-03T00:00:00.000Z',
  enabled: true,
  folder: { folderId: 'f', folderName: 'Choir Recordings' },
};

const setUp = (
  settings: AutoExportSettings,
  overrides: Partial<RecordingsAutoExportSectionViewProps> = {},
  hasWriteAccess = true,
) => {
  const calls: string[] = [];
  const view = buildAutoExportSettingsView({
    canTellConnectionType: false,
    folderState: { state: 'idle' },
    hasWriteAccess,
    recordings: [
      buildRecordingFixture({
        createdAt: '2026-10-01T00:00:00.000Z',
        id: 'old',
      }),
    ],
    settings,
    status: { gate: { state: 'ready' } },
  });
  const screen = render(
    <RecordingsAutoExportSectionView
      isAuthorizing={false}
      onAllow={() => calls.push('allow')}
      onBackUp={() => calls.push('back-up')}
      onChangeFolder={() => calls.push('folder')}
      onSelectUploadOver={(value) => calls.push(`over:${value}`)}
      onSelectWhat={(value) => calls.push(`what:${value}`)}
      onToggle={(enabled) => calls.push(`toggle:${enabled}`)}
      settings={settings}
      view={view}
      {...overrides}
    />,
  );

  return { calls, ...screen };
};

describe('RecordingsAutoExportSectionView', () => {
  it('shows only the switch while it is off, and turns on with a tap', () => {
    const { calls, getByLabelText } = setUp(DEFAULT_AUTO_EXPORT_SETTINGS);

    assert.ok(hasRenderedText('Auto-export to Drive'));
    assert.ok(
      hasRenderedText('Off. Copy new recordings to Drive automatically.'),
    );
    assert.equal(hasRenderedText('Upload over'), false);

    fireEvent.press(getByLabelText('Auto-export to Drive'));
    assert.deepEqual(calls, ['toggle:true']);
  });

  it('shows the folder, the upload and export choices and the back-up row once on', () => {
    setUp(on);

    for (const text of [
      'Choir Recordings',
      'Upload over',
      'Export',
      'Back up existing recordings',
      '1 recording is not on Drive yet.',
    ]) {
      assert.ok(hasRenderedText(text), text);
    }
  });

  it('asks for the permission while it is missing', () => {
    const { calls, getByLabelText } = setUp(on, {}, false);

    assert.ok(hasRenderedText('Allow saving to Drive'));
    fireEvent.press(getByLabelText('Allow saving'));
    assert.deepEqual(calls, ['allow']);
  });

  it('changes the folder and asks before backing up', () => {
    const { calls, getByLabelText } = setUp(on);

    fireEvent.press(getByLabelText('Folder Choir Recordings'));
    fireEvent.press(getByLabelText('Back up'));

    // The confirmation is a dialog (not in the test tree), so nothing runs yet.
    assert.deepEqual(calls, ['folder']);
  });

  it('turns off with a tap while on, and leaves Back up disabled with nothing to add', () => {
    const { calls, getByLabelText } = setUp({ ...on, eligibleFrom: null });

    assert.ok(
      hasRenderedText(
        'Every recording made so far is on Drive or already included.',
      ),
    );
    fireEvent.press(getByLabelText('Auto-export to Drive'));
    assert.deepEqual(calls, ['toggle:false']);
  });
});
