/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createWebPitchShifter,
  type WebPitchShifterDependencies,
} from './web-pitch-shifter-core.js';

// A recording fake of the Web Audio graph: what matters is the order of
// calls (the element can only be routed once) and the final node value.
const createGraphFake = (
  options: {
    elements?: Array<{ preservesPitch?: boolean } | null>;
    failRegister?: boolean;
  } = {},
) => {
  const calls: string[] = [];
  const node = {
    connect: () => void calls.push('node.connect'),
    pitchSemitones: { value: 0 },
  };
  const context = {
    createMediaElementSource: () => {
      calls.push('createMediaElementSource');
      return { connect: () => void calls.push('source.connect') };
    },
    destination: {},
    resume: async () => {
      calls.push('resume');
      context.state = 'running';
    },
    state: 'suspended',
  };
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

  return {
    calls,
    dependencies,
    node,
    shifter: createWebPitchShifter(dependencies),
  };
};

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

    assert.deepEqual(calls, [
      'createAudioContext',
      'registerProcessor',
      'createPitchNode',
      'createMediaElementSource',
      'source.connect',
      'node.connect',
      'resume',
    ]);
    assert.equal(node.pitchSemitones.value, 3);
  });

  it('leaves tempo to the browser time-stretch', async () => {
    const element = { preservesPitch: false };
    const { shifter } = createGraphFake({ elements: [element] });

    await shifter.setSemitones(2);

    assert.equal(element.preservesPitch, true);
  });

  it('reuses the graph for later changes and for a return to zero', async () => {
    const { calls, node, shifter } = createGraphFake();

    await shifter.setSemitones(3);
    await shifter.setSemitones(-5);
    await shifter.setSemitones(0);

    assert.equal(
      calls.filter((call) => call === 'createMediaElementSource').length,
      1,
    );
    assert.equal(node.pitchSemitones.value, 0);
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
    const { calls, shifter } = createGraphFake({
      elements: [first, second],
    });

    await shifter.setSemitones(1);
    await shifter.setSemitones(1);

    assert.equal(
      calls.filter((call) => call === 'createMediaElementSource').length,
      2,
    );
  });
});
