import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type CompositeTrack,
} from '@org/audio-library-models';

import { getTrackRemoveFromLibraryAffectedSections } from '../components/saved-rehearsal-library-section/library-files-delete-copy';
import { getTrackRemoveFromLibraryImpact } from './library-files-removal-impact';

const SOURCE = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'drive-file-1',
  durationMs: 245000,
  mimeType: 'audio/mpeg',
  name: 'Bass.m4a',
});

const compositeUsing = (name: string, trackId: string): CompositeTrack => ({
  createdAt: '2026-07-01T00:00:00.000Z',
  defaultMix: { levels: {} },
  id: `composite:${name}`,
  name,
  presets: [],
  stems: [{ id: 's1', mine: false, name: 'Bass', offsetMs: 0, trackId }],
});

const impactWith = (composites: CompositeTrack[]) =>
  getTrackRemoveFromLibraryImpact(
    null,
    { savedLoops: [], savedPlaylists: [], savedSources: [SOURCE] },
    SOURCE.id,
    composites,
  );

describe('track remove impact with composites', () => {
  it('lists the composites that use the track as a stem', () => {
    const impact = impactWith([
      compositeUsing('Seeded SATB', SOURCE.id),
      compositeUsing('Unrelated', 'other-track'),
    ]);

    assert.equal(impact.compositeCount, 1);
    assert.deepEqual(impact.compositeNames, ['Seeded SATB']);
  });

  it('shows them as a `Composites` section in the dialog', () => {
    const sections = getTrackRemoveFromLibraryAffectedSections(
      impactWith([compositeUsing('Seeded SATB', SOURCE.id)]),
    );

    assert.deepEqual(sections, [
      { items: ['Seeded SATB'], title: 'Composites (1)' },
    ]);
  });

  it('adds nothing when no composite uses the track', () => {
    assert.equal(impactWith([]).compositeCount, 0);
  });
});
