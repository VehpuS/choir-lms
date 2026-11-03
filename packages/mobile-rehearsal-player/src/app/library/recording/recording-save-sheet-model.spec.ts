import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Recording } from '@org/audio-library-models';

import {
  getSaveSheetModel,
  MAX_RECORDING_NAME_LENGTH,
  resolveRecordingName,
  type AutoExportState,
} from './recording-save-sheet-model.js';

const OFF: AutoExportState = { kind: 'off' };

const recording = (overrides: Partial<Recording> = {}): Recording => ({
  id: 'rec-1',
  name: 'Recording 1',
  createdAt: '2026-01-01T00:00:00.000Z',
  durationMs: 42_000,
  sampleRate: 44_100,
  sizeBytes: 3_774_874,
  appliedLatencyMs: 30,
  nudgeMs: 0,
  source: { driveFileId: 'drive-1', name: 'Song.mp3', durationMs: 240_000 },
  lineage: {
    track: { id: 'track-1', driveFileId: 'drive-1', name: 'Song.mp3' },
  },
  shaping: { rate: 1, pitchSemitones: 0 },
  balance: 50,
  engineVersion: 1,
  markers: [
    { name: 'Verse 2', positionMs: 38_000 },
    { name: 'Chorus', positionMs: 80_000 },
  ],
  timeline: [
    {
      recordingStartMs: 0,
      recordingEndMs: 42_000,
      trackStartMs: 38_000,
      held: false,
    },
  ],
  ...overrides,
});

describe('save sheet model', () => {
  it('summarises duration and size, with marker names and plain times', () => {
    const model = getSaveSheetModel({
      recording: recording(),
      autoExport: OFF,
    });

    assert.equal(model.title, 'Recording saved');
    assert.equal(model.summary, '0:42 · 3.6 MB');
    assert.equal(model.markerSpan, 'Verse 2 → Chorus');
    assert.equal(model.timeSpan, 'Track 0:38–1:20 · recording 0:00–0:42');
  });

  it('names the shaping the take was recorded against', () => {
    const model = getSaveSheetModel({
      recording: recording({ shaping: { rate: 0.7, pitchSemitones: 2 } }),
      autoExport: OFF,
    });

    assert.match(model.summary, /recorded against 0\.7× \+2$/);
  });

  it('names only the changed half of the shaping', () => {
    const pitchOnly = getSaveSheetModel({
      recording: recording({ shaping: { rate: 1, pitchSemitones: -3 } }),
      autoExport: OFF,
    });

    assert.match(pitchOnly.summary, /recorded against -3$/);
  });

  it('gives one marker name when the span stays inside one section', () => {
    const model = getSaveSheetModel({
      recording: recording({
        durationMs: 10_000,
        timeline: [
          {
            recordingStartMs: 0,
            recordingEndMs: 10_000,
            trackStartMs: 40_000,
            held: false,
          },
        ],
      }),
      autoExport: OFF,
    });

    assert.equal(model.markerSpan, 'Verse 2');
  });

  it('leaves out marker names when the track has none before the span', () => {
    const model = getSaveSheetModel({
      recording: recording({ markers: [] }),
      autoExport: OFF,
    });

    assert.equal(model.markerSpan, undefined);
    assert.equal(model.timeSpan, 'Track 0:38–1:20 · recording 0:00–0:42');
  });

  it('measures the track span across pauses and seeks, excluding held time', () => {
    const model = getSaveSheetModel({
      recording: recording({
        durationMs: 30_000,
        timeline: [
          {
            recordingStartMs: 0,
            recordingEndMs: 10_000,
            trackStartMs: 20_000,
            held: false,
          },
          {
            recordingStartMs: 10_000,
            recordingEndMs: 15_000,
            trackStartMs: 30_000,
            held: true,
          },
          {
            recordingStartMs: 15_000,
            recordingEndMs: 30_000,
            trackStartMs: 5_000,
            held: false,
          },
        ],
      }),
      autoExport: OFF,
    });

    // 5 s to 30 s of track: the seek back counts as part of the span.
    assert.equal(model.timeSpan, 'Track 0:05–0:30 · recording 0:00–0:30');
  });

  it('omits the span lines when the track never advanced', () => {
    const model = getSaveSheetModel({
      recording: recording({
        timeline: [
          {
            recordingStartMs: 0,
            recordingEndMs: 42_000,
            trackStartMs: 38_000,
            held: true,
          },
        ],
      }),
      autoExport: OFF,
    });

    assert.equal(model.timeSpan, undefined);
    assert.equal(model.markerSpan, undefined);
  });

  it('says the recording stays on this device', () => {
    const model = getSaveSheetModel({
      recording: recording(),
      autoExport: OFF,
    });

    assert.match(model.storedNote, /never removed automatically/);
  });

  it('offers to turn auto-export on when it is off', () => {
    const { autoExport } = getSaveSheetModel({
      recording: recording(),
      autoExport: OFF,
    });

    assert.equal(autoExport.title, 'Auto-export is off');
    assert.equal(autoExport.turnOn?.label, 'Turn on…');
  });

  it('says what is uploaded and where when auto-export is on', () => {
    const { autoExport } = getSaveSheetModel({
      recording: recording(),
      autoExport: {
        kind: 'on',
        what: 'both',
        folderName: 'Choir Recordings',
        wifiOnly: true,
        percent: 62,
      },
    });

    assert.equal(autoExport.title, 'Auto-export is on');
    assert.equal(
      autoExport.detail,
      'Uploading the recording and the mix to Choir Recordings (Wi-Fi only)…',
    );
    assert.equal(autoExport.turnOn, undefined);
    assert.equal(autoExport.percent, 62);
  });

  it('says what will be uploaded, not that it is uploading, until an upload runs', () => {
    const { autoExport } = getSaveSheetModel({
      recording: recording(),
      autoExport: {
        kind: 'on',
        what: 'recording',
        folderName: 'Choir Recordings',
        wifiOnly: false,
      },
    });

    assert.equal(
      autoExport.detail,
      'Will upload the recording to Choir Recordings.',
    );
    assert.equal(autoExport.percent, undefined);
  });

  it('drops the Wi-Fi note for any connection', () => {
    const { autoExport } = getSaveSheetModel({
      recording: recording(),
      autoExport: {
        kind: 'on',
        what: 'mix',
        folderName: 'Choir Recordings',
        wifiOnly: false,
      },
    });

    assert.equal(autoExport.detail, 'Will upload the mix to Choir Recordings.');
  });

  it('carries a stop warning but not a routine stop', () => {
    const warned = getSaveSheetModel({
      recording: recording(),
      autoExport: OFF,
      stop: { message: 'Storage is full.', isProblem: true, offerExport: true },
    });
    const routine = getSaveSheetModel({
      recording: recording(),
      autoExport: OFF,
      stop: {
        message: 'Recording saved.',
        isProblem: false,
        offerExport: false,
      },
    });

    assert.equal(warned.notice, 'Storage is full.');
    assert.equal(routine.notice, undefined);
  });
});

describe('resolveRecordingName', () => {
  it('trims what was typed', () => {
    assert.equal(
      resolveRecordingName('  Take two ', 'Recording 1'),
      'Take two',
    );
  });

  it('keeps the current name when nothing usable was typed', () => {
    assert.equal(resolveRecordingName('   ', 'Recording 1'), 'Recording 1');
  });

  it('caps the length', () => {
    const long = 'a'.repeat(MAX_RECORDING_NAME_LENGTH + 20);

    assert.equal(
      resolveRecordingName(long, 'Recording 1').length,
      MAX_RECORDING_NAME_LENGTH,
    );
  });
});
