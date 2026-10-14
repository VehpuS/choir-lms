import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveLyricsOwner } from './source-lyrics.ts';
import {
  parseSourceSheetMusic,
  type SheetMusicSource,
} from './source-sheet-music.ts';

const [score] =
  parseSourceSheetMusic([
    {
      id: 'score',
      label: 'Score',
      location: { kind: 'url', url: 'https://example.com/score.pdf' },
      format: 'pdf',
      addedAt: '2026-01-01T00:00:00.000Z',
    },
  ]) ?? [];

describe('sheet music owner resolution', () => {
  type OwnerSource = {
    id: string;
    adjustment?: { sourceRef: string };
    sheetMusic?: SheetMusicSource[];
  };
  const track: OwnerSource = { id: 'track', sheetMusic: [score] };
  const adjusted: OwnerSource = {
    id: 'adjusted',
    adjustment: { sourceRef: 'track' },
  };
  const orphan: OwnerSource = {
    id: 'orphan',
    adjustment: { sourceRef: 'gone' },
  };
  const sources = [track, adjusted, orphan];

  it('reads the owning track list for a track, an adjusted track, and loops', () => {
    for (const item of [
      { id: 'track' },
      adjusted,
      { id: 'loop', sourceId: 'track' },
      { id: 'loop', sourceId: 'adjusted' },
    ]) {
      assert.equal(
        resolveLyricsOwner(item, sources)?.sheetMusic,
        track.sheetMusic,
      );
    }
  });

  it('has no sheet music when the owner was deleted', () => {
    assert.equal(resolveLyricsOwner(orphan, sources), null);
    assert.equal(
      resolveLyricsOwner({ id: 'loop', sourceId: 'orphan' }, sources),
      null,
    );
  });
});
