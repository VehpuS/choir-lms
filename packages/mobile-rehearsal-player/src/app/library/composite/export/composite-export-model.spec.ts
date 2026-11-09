import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CompositeMix } from '@org/audio-library-models';

import {
  buildCompositeExportModel,
  describeShaping,
} from './composite-export-model';

const MS = 205_000; // 3:25
const stem = (id: string, name: string, mine = false) => ({
  id,
  trackId: `t-${id}`,
  name,
  offsetMs: 0,
  mine,
});
const composite = {
  id: 'c1',
  name: 'Ubi caritas',
  presets: [],
  stems: [
    stem('s1', 'Soprano'),
    stem('s2', 'Alto'),
    stem('s3', 'Tenor'),
    stem('s4', 'Bass', true),
  ],
};
const available = { status: 'available' } as const;
const tracks = (missingIds: string[] = [], durationMs: number | null = MS) =>
  new Map(
    composite.stems
      .filter((s) => !missingIds.includes(s.id))
      .map((s) => [
        s.trackId,
        {
          id: s.trackId,
          availability: available,
          durationMs: durationMs ?? undefined,
        },
      ]),
  ) as never;
const ALL_PARTS: CompositeMix = { levels: {} };
const WITHOUT_BASS: CompositeMix = {
  levels: { s4: { volume: 100, muted: true, soloed: false } },
};
const NO_SHAPING = { rate: 1, pitchSemitones: 0 };

describe('buildCompositeExportModel', () => {
  it('names the file after the composite and the mix', () => {
    const model = buildCompositeExportModel({
      composite,
      mix: WITHOUT_BASS,
      sampleRate: 44_100,
      shaping: NO_SHAPING,
      tracks: tracks(),
    });

    assert.equal(model.mixName, 'Without Bass');
    assert.equal(model.defaultFileName, 'Ubi caritas · Without Bass.wav');
  });

  it('calls a mix that matches no preset a custom mix', () => {
    const model = buildCompositeExportModel({
      composite,
      mix: { levels: { s1: { volume: 40, muted: false, soloed: false } } },
      sampleRate: 44_100,
      shaping: NO_SHAPING,
      tracks: tracks(),
    });

    assert.equal(model.defaultFileName, 'Ubi caritas · Custom mix.wav');
  });

  it('describes what is rendered and estimates its size and length', () => {
    const model = buildCompositeExportModel({
      composite,
      mix: ALL_PARTS,
      sampleRate: 44_100,
      shaping: { rate: 0.5, pitchSemitones: 2 },
      tracks: tracks(),
    });

    assert.match(
      model.description,
      /All parts, 0\.5× · \+2 st\) as a 16-bit WAV/,
    );
    // 3:25 at half speed is 6:50, mono 16-bit at 44.1 kHz is about 36 MB.
    assert.equal(model.durationMs, MS * 2);
    assert.match(model.estimateLabel ?? '', /^About .* · 6:50\.$/);
  });

  it('resolves mute and solo into gains for the stems it renders', () => {
    const model = buildCompositeExportModel({
      composite,
      mix: WITHOUT_BASS,
      sampleRate: 44_100,
      shaping: NO_SHAPING,
      tracks: tracks(),
    });

    assert.deepEqual(
      model.stems.map(({ id, gain }) => [id, gain]),
      [
        ['s1', 1],
        ['s2', 1],
        ['s3', 1],
        ['s4', 0],
      ],
    );
  });

  it('names a missing stem and leaves it out', () => {
    const model = buildCompositeExportModel({
      composite,
      mix: ALL_PARTS,
      sampleRate: 44_100,
      shaping: NO_SHAPING,
      tracks: tracks(['s2']),
    });

    assert.deepEqual(model.missingStemNames, ['Alto']);
    assert.equal(model.stems.length, 3);
    assert.equal(
      model.missingNote,
      'Alto is not included: its track is not available.',
    );
  });

  it('names several missing stems', () => {
    const model = buildCompositeExportModel({
      composite,
      mix: ALL_PARTS,
      sampleRate: 44_100,
      shaping: NO_SHAPING,
      tracks: tracks(['s2', 's3', 's4']),
    });

    assert.equal(
      model.missingNote,
      'Alto, Tenor and Bass are not included: their tracks are not available.',
    );
  });

  it('cannot export when every stem is missing', () => {
    const model = buildCompositeExportModel({
      composite,
      mix: ALL_PARTS,
      sampleRate: 44_100,
      shaping: NO_SHAPING,
      tracks: tracks(['s1', 's2', 's3', 's4']),
    });

    assert.equal(model.canExport, false);
  });

  it('gives no estimate while a track length is unknown', () => {
    const model = buildCompositeExportModel({
      composite,
      mix: ALL_PARTS,
      sampleRate: 44_100,
      shaping: NO_SHAPING,
      tracks: tracks([], null),
    });

    assert.equal(model.estimateLabel, undefined);
    assert.equal(model.canExport, true);
  });
});

describe('describeShaping', () => {
  it('words speed and pitch', () => {
    assert.equal(describeShaping({ rate: 1, pitchSemitones: 0 }), '1× · 0 st');
    assert.equal(
      describeShaping({ rate: 0.7, pitchSemitones: -3 }),
      '0.7× · −3 st',
    );
  });
});
