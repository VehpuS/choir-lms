import type { PlaybackPitchShifter } from './playback-shaping-types';

type AudioParamLike = { value: number };

type RampableParamLike = AudioParamLike & {
  setTargetAtTime: (
    target: number,
    startTime: number,
    timeConstant: number,
  ) => unknown;
};

type GainNodeLike = {
  connect: (destination: unknown) => unknown;
  gain: RampableParamLike;
};

type PitchNodeLike = {
  connect: (destination: unknown) => unknown;
  pitchSemitones: AudioParamLike;
};

type SourceNodeLike = {
  connect: (destination: unknown) => unknown;
  disconnect: (destination: unknown) => unknown;
};

type MediaElementLike = {
  preservesPitch?: boolean;
};

type AudioContextLike = {
  createGain: () => GainNodeLike;
  createMediaElementSource: (element: never) => SourceNodeLike;
  currentTime: number;
  destination: unknown;
  resume: () => Promise<void>;
  state: string;
};

export type WebPitchShifterDependencies<
  Element extends MediaElementLike = MediaElementLike,
> = {
  createAudioContext: () => AudioContextLike;
  createPitchNode: (context: AudioContextLike) => PitchNodeLike;
  getMediaElement: () => Element | null;
  registerProcessor: (context: AudioContextLike) => Promise<void>;
};

type PitchGraph = {
  /** The direct path, audible at 0 st. */
  dry: GainNodeLike;
  element: MediaElementLike;
  node: PitchNodeLike;
  source: SourceNodeLike;
  /** The path through the pitch node, audible while shifting. */
  wet: GainNodeLike;
};

// A crossfade this short is inaudible as a fade but avoids the click of
// switching paths; the time constant reaches ~99% in five of them.
const CROSSFADE_TIME_CONSTANT_SECONDS = 0.01;
const CROSSFADE_SETTLE_MS = 80;

const SUSPENDED_STATE = 'suspended';
const NO_MEDIA_ELEMENT_MESSAGE =
  'Pitch cannot change until playback has been set up.';

/**
 * Pitch for the web player: the media element feeds a SoundTouch AudioWorklet
 * that only shifts pitch, while the element's own `playbackRate` (with
 * `preservesPitch`) keeps handling tempo. The element's volume and mute still
 * apply upstream of the graph, so the volume slider needs no extra gain node.
 *
 * The graph is built on the first non-zero pitch, so playback that never
 * shifts pitch never leaves the browser's native output path.
 * `createMediaElementSource` can run once per element and permanently reroutes
 * it, so everything that can fail (context, processor, node) runs before it.
 *
 * Once built, the graph keeps a direct (dry) path next to the pitch (wet)
 * path. At 0 st the audio crossfades to the dry path and the pitch node stops
 * being fed, so speed-only playback after touching pitch carries no extra DSP
 * (and none of its latency or per-change artifacts).
 */
export const createWebPitchShifter = <Element extends MediaElementLike>(
  dependencies: WebPitchShifterDependencies<Element>,
): PlaybackPitchShifter => {
  let context: AudioContextLike | null = null;
  // The latest graph request, settled or pending, so overlapping calls for
  // the same element share one build instead of routing it twice.
  let latest: { element: Element; promise: Promise<PitchGraph> } | null = null;
  let hasGraph = false;
  let isWet = false;
  // Invalidates a pending disconnect when the pitch moves off zero again.
  let bypassGeneration = 0;

  const buildGraph = async (element: Element): Promise<PitchGraph> => {
    context ??= dependencies.createAudioContext();
    await dependencies.registerProcessor(context);

    const node = dependencies.createPitchNode(context);
    const dry = context.createGain();
    const wet = context.createGain();

    dry.gain.value = 1;
    wet.gain.value = 0;
    node.connect(wet);
    wet.connect(context.destination);
    dry.connect(context.destination);

    const source = context.createMediaElementSource(element as never);

    source.connect(dry);
    // Tempo stays with the browser's pitch-preserving time-stretch.
    element.preservesPitch = true;
    hasGraph = true;

    return { dry, element, node, source, wet };
  };

  // A different element needs its own source node; the processor and the
  // context are reused.
  const resolveGraph = (element: Element) => {
    if (latest?.element === element) {
      return latest.promise;
    }

    const promise = buildGraph(element);
    const request = { element, promise };

    latest = request;
    // A failed build must not be cached, or the shifter could never retry.
    promise.catch(() => {
      if (latest === request) {
        latest = null;
      }
    });

    return promise;
  };

  const applySemitones = async (semitones: number) => {
    const element = dependencies.getMediaElement();

    // Nothing to undo before the graph exists.
    if (semitones === 0 && !hasGraph) {
      return;
    }

    if (!element) {
      throw new Error(NO_MEDIA_ELEMENT_MESSAGE);
    }

    const activeGraph = await resolveGraph(element);

    if (context?.state === SUSPENDED_STATE) {
      await context.resume();
    }

    routeForPitch(activeGraph, semitones);
  };

  const crossfadeTo = (graph: PitchGraph, wetLevel: number) => {
    const startTime = context?.currentTime ?? 0;

    graph.wet.gain.setTargetAtTime(
      wetLevel,
      startTime,
      CROSSFADE_TIME_CONSTANT_SECONDS,
    );
    graph.dry.gain.setTargetAtTime(
      1 - wetLevel,
      startTime,
      CROSSFADE_TIME_CONSTANT_SECONDS,
    );
  };

  const routeForPitch = (graph: PitchGraph, semitones: number) => {
    bypassGeneration += 1;

    if (semitones !== 0) {
      graph.node.pitchSemitones.value = semitones;

      if (!isWet) {
        // Feed the pitch node before fading it in.
        graph.source.connect(graph.node);
        isWet = true;
        crossfadeTo(graph, 1);
      }

      return;
    }

    if (!isWet) {
      return;
    }

    isWet = false;
    crossfadeTo(graph, 0);

    const generation = bypassGeneration;

    // Stop feeding the pitch node once the fade is done, unless pitch moved
    // off zero again in the meantime.
    setTimeout(() => {
      if (generation === bypassGeneration && !isWet) {
        graph.source.disconnect(graph.node);
        graph.node.pitchSemitones.value = 0;
      }
    }, CROSSFADE_SETTLE_MS);
  };

  // Changes run in call order, so the latest request always wins even while
  // the first one is still building the graph or resuming the context.
  let queue: Promise<unknown> = Promise.resolve();

  return {
    setSemitones: (semitones) => {
      const run = queue.then(() => applySemitones(semitones));

      queue = run.catch(() => undefined);

      return run;
    },
  };
};
