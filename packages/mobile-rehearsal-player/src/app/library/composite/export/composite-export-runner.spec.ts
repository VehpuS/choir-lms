import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PcmWindowReader, SumShaper } from '@org/audio-mixing';

import {
  createExportRun,
  reduceExportRun,
  type ExportRun,
  type ExportRunEvent,
} from '../../recording/export/recording-export-model';
import type { LoadStem } from '../loading/composite-stem-loader';
import {
  runCompositeExport,
  type CompositeExportDependencies,
  type CompositeExportPlan,
} from './composite-export-runner';

const RATE = 1000;
const WAV_HEADER_BYTES = 44;

const constantReader = (samples: number, value: number): PcmWindowReader => ({
  durationMs: (samples * 1000) / RATE,
  read: async (start, count) =>
    new Float32Array(
      Math.max(0, Math.min(samples, start + count) - start),
    ).fill(value),
  sampleCount: samples,
  sampleRate: RATE,
});

const unusedShaper: SumShaper = {
  open: async () => {
    throw new Error('not used at speed 1');
  },
  sampleRate: RATE,
};

const PLAN: CompositeExportPlan = {
  destination: 'download',
  exportId: 'c1',
  fileName: 'Ubi caritas · All parts.wav',
  shaping: { pitchSemitones: 0, rate: 1 },
  stems: [
    { gain: 1, id: 's1', offsetMs: 0 },
    { gain: 0.5, id: 's2', offsetMs: 0 },
  ],
};

const setup = (overrides: Partial<CompositeExportDependencies> = {}) => {
  const calls = {
    loaded: [] as string[],
    saved: [] as Array<{ name: string; size: number }>,
    uploaded: [] as Array<{ folderId: string; name: string }>,
  };
  let run: ExportRun = createExportRun([
    { fileName: PLAN.fileName, recordingId: 'c1' },
  ]);
  const events: ExportRunEvent[] = [];
  const deps: CompositeExportDependencies = {
    createShaper: () => unusedShaper,
    loadStem: (async ({ stemId, onProgress }) => {
      calls.loaded.push(stemId);
      onProgress(1);

      return constantReader(500, stemId === 's1' ? 0.2 : 0.4);
    }) satisfies LoadStem,
    makeBlob: (parts, type) => new Blob(parts as BlobPart[], { type }),
    sampleRate: RATE,
    saveToDevice: (name, blob) => {
      calls.saved.push({ name, size: blob.size });
    },
    upload: (async (options) => {
      calls.uploaded.push({ folderId: options.folderId, name: options.name });

      return {
        file: { id: 'file-1', name: options.name },
        status: 'uploaded',
      };
    }) as CompositeExportDependencies['upload'],
    ...overrides,
  };
  const dispatch = (event: ExportRunEvent) => {
    events.push(event);
    run = reduceExportRun(run, event);
  };

  return { calls, deps, dispatch, events, run: () => run };
};

describe('runCompositeExport', () => {
  it('loads every stem, renders the mix and downloads it under the chosen name', async () => {
    const t = setup();

    await runCompositeExport(PLAN, t.deps, {
      dispatch: t.dispatch,
      signal: new AbortController().signal,
    });

    assert.deepEqual(t.calls.loaded, ['s1', 's2']);
    // 500 mono 16-bit frames and a 44-byte header.
    assert.deepEqual(t.calls.saved, [
      { name: 'Ubi caritas · All parts.wav', size: WAV_HEADER_BYTES + 1000 },
    ]);
    assert.equal(t.run().items[0]?.status, 'done');
    assert.equal(t.run().items[0]?.savedTo, 'Downloads');
    assert.equal(t.run().step, 'finished');
  });

  it('reports progress that rises to one', async () => {
    const t = setup();

    await runCompositeExport(PLAN, t.deps, {
      dispatch: t.dispatch,
      signal: new AbortController().signal,
    });

    const progress = t.events.flatMap((event) =>
      event.type === 'item-progress' ? [event.progress] : [],
    );

    assert.ok(progress.length > 2);
    assert.deepEqual(
      [...progress].sort((a, b) => a - b),
      progress,
    );
    assert.equal(t.run().items[0]?.progress, 1);
  });

  it('uploads to the confirmed Drive folder', async () => {
    const t = setup();

    await runCompositeExport(
      {
        ...PLAN,
        accessToken: 'token',
        destination: 'drive',
        folder: { folderId: 'f1', folderName: 'Exports' },
      },
      t.deps,
      { dispatch: t.dispatch, signal: new AbortController().signal },
    );

    assert.deepEqual(t.calls.uploaded, [
      { folderId: 'f1', name: 'Ubi caritas · All parts.wav' },
    ]);
    assert.equal(t.run().items[0]?.savedTo, 'Exports');
  });

  it('fails the export when a stem cannot be loaded', async () => {
    const t = setup({
      loadStem: async () => {
        throw new Error('track unavailable');
      },
    });

    await runCompositeExport(PLAN, t.deps, {
      dispatch: t.dispatch,
      signal: new AbortController().signal,
    });

    assert.equal(t.run().items[0]?.status, 'failed');
    assert.equal(t.run().items[0]?.failure, 'stem');
    assert.equal(t.calls.saved.length, 0);
  });

  it('says there is no room when preparing a stem fills the device', async () => {
    const t = setup({
      loadStem: async () => {
        throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
      },
    });

    await runCompositeExport(PLAN, t.deps, {
      dispatch: t.dispatch,
      signal: new AbortController().signal,
    });

    assert.equal(t.run().items[0]?.failure, 'no-room');
  });

  it('delivers nothing when cancelled while stems load', async () => {
    const controller = new AbortController();
    const t = setup({
      loadStem: async () => {
        controller.abort();
        throw new Error('aborted');
      },
    });

    await runCompositeExport(PLAN, t.deps, {
      dispatch: t.dispatch,
      signal: controller.signal,
    });

    assert.equal(t.run().step, 'cancelled');
    assert.equal(t.calls.saved.length, 0);
  });

  it('reports a failed render', async () => {
    const t = setup({
      loadStem: async () => ({
        ...constantReader(500, 0.1),
        read: async () => {
          throw new Error('unreadable');
        },
      }),
    });

    await runCompositeExport(PLAN, t.deps, {
      dispatch: t.dispatch,
      signal: new AbortController().signal,
    });

    assert.equal(t.run().items[0]?.failure, 'render');
  });

  it('writes a file as long as the longest stem even when it is muted', async () => {
    const t = setup({
      loadStem: async ({ stemId }) =>
        constantReader(stemId === 's1' ? 500 : 800, 0.2),
    });

    await runCompositeExport(
      {
        ...PLAN,
        stems: [
          { gain: 1, id: 's1', offsetMs: 0 },
          { gain: 0, id: 's2', offsetMs: 0 },
        ],
      },
      t.deps,
      { dispatch: t.dispatch, signal: new AbortController().signal },
    );

    assert.equal(t.calls.saved[0]?.size, WAV_HEADER_BYTES + 1600);
  });
});
