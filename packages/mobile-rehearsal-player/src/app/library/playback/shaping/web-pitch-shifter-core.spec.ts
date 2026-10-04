/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import {
  createWebPitchShifter,
  type WebPitchShifterDependencies,
} from './web-pitch-shifter-core.js';

type GainTarget = { target: number; time: number };

// A recording fake of the Web Audio graph: what matters is the order of calls
// (the element can only be routed once), which path is audible, and whether the
// pitch node is being fed.
const createGraphFake = (
  options: {
    elements?: Array<{ preservesPitch?: boolean } | null>;
    failRegister?: boolean;
  } = {},
) => {
  const calls: string[] = [];
  const createGain = (name: string) => {
    const targets: GainTarget[] = [];

    return {
      connect: () => void calls.push(`${name}.connect`),
      gain: {
        setTargetAtTime: (target: number, time: number) =>
          void targets.push({ target, time }),
        value: 0,
      },
      targets,
    };
  };
  const gains = [createGain('dry'), createGain('wet')];
  const node = {
    connect: () => void calls.push('node.connect'),
    pitchSemitones: { value: 0 },
  };
  const context = {
    createGain: () => {
      // A replacement element builds a second pair of gains.
      const next = gains[createdGains] ?? createGain(`extra${createdGains}`);
      createdGains += 1;
      calls.push('createGain');
      return next as NonNullable<typeof next>;
    },
    createMediaElementSource: () => {
      calls.push('createMediaElementSource');
      return {
        connect: () => void calls.push('source.connect'),
        disconnect: () => void calls.push('source.disconnect'),
      };
    },
    currentTime: 1,
    destination: {},
    resume: async () => {
      calls.push('resume');
      context.state = 'running';
    },
    state: 'suspended',
  };
  let createdGains = 0;
  const elements = options.elements ?? [{ preservesPitch: false }];
  let elementCall = 0;
  const dependencies: WebPitchShifterDependencies = {
    createAudioContext: () => {
      calls.push('createAudioContext');
      return context;
    },
    createPitchNode: () => {
      calls.push('createPitchNode');
      return node;
    },
    getMediaElement: () =>
      elements[Math.min(elementCall++, elements.length - 1)] ?? null,
    registerProcessor: async () => {
      calls.push('registerProcessor');
      if (options.failRegister) {
        throw new Error('processor failed');
      }
    },
  };
  const [dry, wet] = gains as [(typeof gains)[0], (typeof gains)[1]];
  const lastTarget = (gain: typeof dry) => gain.targets.at(-1)?.target;

  return {
    calls,
    dry,
    lastTarget,
    node,
    shifter: createWebPitchShifter(dependencies),
    wet,
  };
};

afterEach(() => {
  mock.timers.reset();
});

describe('web pitch shifter', () => {
  it('shares one build between overlapping first calls', async () => {
    const { calls, node, shifter } = createGraphFake();

    await Promise.all([shifter.setSemitones(2), shifter.setSemitones(5)]);

    assert.equal(
      calls.filter((call) => call === 'createMediaElementSource').length,
      1,
    );
    assert.equal(node.pitchSemitones.value, 5);
  });

  it('builds nothing while pitch stays at zero', async () => {
    const { calls, shifter } = createGraphFake();

    await shifter.setSemitones(0);

    assert.deepEqual(calls, []);
  });

  it('builds the graph on the first shift, routing the element last', async () => {
    const { calls, node, shifter } = createGraphFake();

    await shifter.setSemitones(3);

    assert.deepEqual(calls.slice(0, 7), [
      'createAudioContext',
      'registerProcessor',
      'createPitchNode',
      'createGain',
      'createGain',
      'node.connect',
      'wet.connect',
    ]);
    assert.ok(
      calls.indexOf('createMediaElementSource') >
        calls.indexOf('createPitchNode'),
      'the element is routed only after everything that can fail',
    );
    assert.equal(node.pitchSemitones.value, 3);
  });

  it('fades the pitch path in and the direct path out on the first shift', async () => {
    const { dry, lastTarget, shifter, wet } = createGraphFake();

    await shifter.setSemitones(3);

    assert.equal(lastTarget(wet), 1);
    assert.equal(lastTarget(dry), 0);
  });

  it('leaves tempo to the browser time-stretch', async () => {
    const element = { preservesPitch: false };
    const shifter = createGraphFake({ elements: [element] }).shifter;

    await shifter.setSemitones(2);

    assert.equal(element.preservesPitch, true);
  });

  it('crossfades back to the direct path at 0 st and stops feeding the pitch node', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const { calls, dry, lastTarget, node, shifter, wet } = createGraphFake();
    await shifter.setSemitones(3);

    await shifter.setSemitones(0);

    assert.equal(lastTarget(dry), 1);
    assert.equal(lastTarget(wet), 0);
    assert.equal(calls.includes('source.disconnect'), false, 'not yet: fading');
    mock.timers.tick(100);
    assert.equal(
      calls.filter((call) => call === 'source.disconnect').length,
      1,
    );
    assert.equal(node.pitchSemitones.value, 0);
  });

  it('feeds the pitch node again before fading it in after a bypass', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const { calls, lastTarget, shifter, wet } = createGraphFake();
    await shifter.setSemitones(3);
    await shifter.setSemitones(0);
    mock.timers.tick(100);
    calls.length = 0;

    await shifter.setSemitones(2);

    assert.deepEqual(calls, ['source.connect']);
    assert.equal(lastTarget(wet), 1);
  });

  it('keeps the pitch node connected when pitch moves off zero during the fade', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const { calls, shifter } = createGraphFake();
    await shifter.setSemitones(3);
    await shifter.setSemitones(0);
    await shifter.setSemitones(4);

    mock.timers.tick(200);

    assert.equal(calls.includes('source.disconnect'), false);
  });

  it('reuses the graph for later changes', async () => {
    const { calls, node, shifter } = createGraphFake();

    await shifter.setSemitones(3);
    await shifter.setSemitones(-5);

    assert.equal(
      calls.filter((call) => call === 'createMediaElementSource').length,
      1,
    );
    assert.equal(node.pitchSemitones.value, -5);
  });

  it('does not route the element when the processor fails, so a retry can work', async () => {
    const { calls, shifter } = createGraphFake({ failRegister: true });

    await assert.rejects(shifter.setSemitones(2), /processor failed/);
    await assert.rejects(shifter.setSemitones(2), /processor failed/);

    assert.equal(calls.includes('createMediaElementSource'), false);
  });

  it('refuses to shift before playback has an element', async () => {
    const { shifter } = createGraphFake({ elements: [null] });

    await assert.rejects(shifter.setSemitones(1), /set up/);
  });

  it('routes a replacement element through its own source', async () => {
    const first = { preservesPitch: true };
    const second = { preservesPitch: true };
    const { calls, shifter } = createGraphFake({ elements: [first, second] });

    await shifter.setSemitones(1);
    await shifter.setSemitones(1);

    assert.equal(
      calls.filter((call) => call === 'createMediaElementSource').length,
      2,
    );
  });
});
