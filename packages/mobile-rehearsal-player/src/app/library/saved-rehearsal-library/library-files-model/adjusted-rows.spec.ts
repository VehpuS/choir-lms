import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createAdjustedLoop,
  createAdjustedTrackSource,
  createDriveAudioSource,
  type DriveAudioSource,
  type NamedLoop,
  type RehearsalLibraryFileLinkNode,
} from '@org/audio-library-models';

import { groupAdjustedRows } from './group-adjusted-rows';
import {
  buildLoopRow,
  buildTrackRow,
  formatTrackMetaLabel,
  sumPlaylistDurationMs,
} from './row-builders';
import type { LibraryFilesRow } from './types';

const transform = {
  pitchSemitones: -2,
  speedMultiplier: 0.5,
  tempoSource: 'multiplier' as const,
};
const source = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'file-1',
  durationMs: 120_000,
  mimeType: 'audio/mpeg',
  name: 'Kyrie.mp3',
});
const otherSource = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'file-2',
  durationMs: 60_000,
  mimeType: 'audio/mpeg',
  name: 'Gloria.mp3',
});
const adjustedTrack = createAdjustedTrackSource({ source, transform });
const adjustedLoop: NamedLoop = createAdjustedLoop({
  id: 'loop-1',
  name: 'Entrance',
  ownerId: 'owner',
  source,
  startMs: 10_000,
  endMs: 20_000,
  transform,
});

const fileLink = (entityId: string): RehearsalLibraryFileLinkNode => ({
  entityId,
  entityKind: 'track',
  id: `link-${entityId}`,
  parentFolderId: 'root',
});
const trackRow = (item: DriveAudioSource) =>
  buildTrackRow({
    entityNameByKey: new Map(),
    fileLink: fileLink(item.id),
    source: item,
  });
const loopRow = (loop: NamedLoop, loopSource: DriveAudioSource) =>
  buildLoopRow({
    entityNameByKey: new Map(),
    fileLink: { ...fileLink(loop.id), entityKind: 'loop' },
    loop,
    source: loopSource,
  });

describe('adjusted row meta', () => {
  it('leads an adjusted track with its kind and transform, then its scaled duration and source', () => {
    assert.equal(
      trackRow(adjustedTrack).supportingLabel,
      'Adjusted track · 0.50× −2 st · 4:00 · Kyrie.mp3',
    );
  });

  it('leaves an ordinary track meta alone', () => {
    assert.equal(trackRow(source).supportingLabel, '2:00');
    assert.equal(
      formatTrackMetaLabel({
        loopCount: 0,
        source: { durationMs: undefined },
        withDuration: true,
      }),
      'Track',
    );
  });

  it('shows an adjusted loop its scaled length, transform and source', () => {
    assert.equal(
      loopRow(adjustedLoop, source).supportingLabel,
      '0:10–0:20 · 0:20 · 0.50× −2 st · Kyrie.mp3',
    );
  });

  it('totals a playlist by the scaled durations of its adjusted items', () => {
    const totalMs = sumPlaylistDurationMs({
      loopsById: new Map([[adjustedLoop.id, adjustedLoop]]),
      playlist: {
        items: [
          { kind: 'track', sourceId: adjustedTrack.id },
          { kind: 'loop', loopId: adjustedLoop.id, sourceId: source.id },
        ],
      } as never,
      sourcesById: new Map([[adjustedTrack.id, adjustedTrack]]),
    });

    assert.equal(totalMs, 240_000 + 20_000);
  });
});

describe('groupAdjustedRows', () => {
  const kyrie = trackRow(source);
  const gloria = trackRow(otherSource);
  const adjustedKyrie = trackRow(adjustedTrack);
  const adjustedKyrieLoop = loopRow(adjustedLoop, source);
  const plainLoop = loopRow(
    { ...adjustedLoop, id: 'loop-2', transform: undefined },
    source,
  );

  const describeRows = (rows: LibraryFilesRow[]) =>
    rows.map((row) => {
      const id =
        row.kind === 'track'
          ? row.source.id
          : row.kind === 'loop'
            ? row.loop.id
            : row.kind;

      return `${id}${'groupedUnderSourceId' in row && row.groupedUnderSourceId ? '*' : ''}`;
    });

  it('moves adjusted tracks and then adjusted loops directly under their source, marked as grouped', () => {
    assert.deepEqual(
      describeRows(
        groupAdjustedRows([
          adjustedKyrieLoop,
          gloria,
          adjustedKyrie,
          kyrie,
          plainLoop,
        ]),
      ),
      [
        gloria.source.id,
        kyrie.source.id,
        `${adjustedKyrie.source.id}*`,
        `${adjustedKyrieLoop.loop.id}*`,
        plainLoop.loop.id,
      ],
    );
  });

  it('leaves an adjusted entity in place when its source is not in the listing', () => {
    assert.deepEqual(
      describeRows(
        groupAdjustedRows([adjustedKyrie, gloria, adjustedKyrieLoop]),
      ),
      [adjustedKyrie.source.id, gloria.source.id, adjustedKyrieLoop.loop.id],
    );
  });

  it('does not mutate the rows it is given', () => {
    const rows = [adjustedKyrie, kyrie];

    groupAdjustedRows(rows);

    assert.equal('groupedUnderSourceId' in adjustedKyrie, false);
    assert.deepEqual(rows, [adjustedKyrie, kyrie]);
  });
});
