import type { PlaybackPitchShifter } from './playback-shaping-types';

type AudioParamLike = { value: number };

type PitchNodeLike = {
  connect: (destination: unknown) => unknown;
  pitchSemitones: AudioParamLike;
};

type MediaElementLike = {
  preservesPitch?: boolean;
};

type AudioContextLike = {
  createMediaElementSource: (element: never) => {
    connect: (destination: unknown) => unknown;
  };
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
  element: MediaElementLike;
  node: PitchNodeLike;
};

const SUSPENDED_STATE = 'suspended';
const NO_MEDIA_ELEMENT_MESSAGE =
  'Pitch cannot change until playback has been set up.';

/**
 * Pitch for the web player: the media element feeds a SoundTouch AudioWorklet
 * that only shifts pitch, while the element's own `playbackRate` (with
 * `preservesPitch`) keeps handling tempo. The element's volume and mute still
 * apply upstream of the graph, so the volume slider needs no extra gain node.
 *
 * The graph is built on the first non-zero pitch, so playback at 0 st never
 * leaves the browser's native output path. `createMediaElementSource` can run
 * once per element and permanently reroutes it, so everything that can fail
 * (context, processor, node) runs before it.
 */
export const createWebPitchShifter = <Element extends MediaElementLike>(
  dependencies: WebPitchShifterDependencies<Element>,
): PlaybackPitchShifter => {
  let context: AudioContextLike | null = null;
  // The latest graph request, settled or pending, so overlapping calls for
  // the same element share one build instead of routing it twice.
  let latest: { element: Element; promise: Promise<PitchGraph> } | null = null;
  let hasGraph = false;

  const buildGraph = async (element: Element): Promise<PitchGraph> => {
    context ??= dependencies.createAudioContext();
    await dependencies.registerProcessor(context);

    const node = dependencies.createPitchNode(context);
    const source = context.createMediaElementSource(element as never);

    source.connect(node);
    node.connect(context.destination);
    // Tempo stays with the browser's pitch-preserving time-stretch.
    element.preservesPitch = true;
    hasGraph = true;

    return { element, node };
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

    activeGraph.node.pitchSemitones.value = semitones;
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
