import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { cleanup, render } from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../test-support/rendered-text';
import { buildRecordingsStorageSummary } from '../../library/recording/recordings-storage-model';
import { RecordingsSectionView } from './recordings-section';

afterEach(cleanup);

const summary = buildRecordingsStorageSummary([
  {
    id: '1',
    name: 'Take 1',
    createdAt: '2026-01-01',
    sizeBytes: 56 * 1024 * 1024,
    lineage: { track: { id: 't', driveFileId: 'd', name: 'Song' } },
  } as never,
]);

describe('RecordingsSectionView', () => {
  it('shows the total and the never-removed line once loaded', () => {
    render(<RecordingsSectionView isLoading={false} summary={summary} />);

    assert.ok(hasRenderedText('Storage used'));
    assert.ok(hasRenderedText('Recordings are never removed automatically'));
    assert.ok(hasRenderedText(summary.totalLabel));
  });

  it('shows no total while the first read is pending, so 0 B never flashes', () => {
    render(
      <RecordingsSectionView
        isLoading
        summary={buildRecordingsStorageSummary([])}
      />,
    );

    assert.ok(hasRenderedText('Storage used'));
    assert.equal(hasRenderedText('0 B'), false);
  });
});
