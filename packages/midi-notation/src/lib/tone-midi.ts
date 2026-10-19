import * as toneMidi from '@tonejs/midi';

type MidiClass = typeof toneMidi.Midi;

export type ToneMidiFile = InstanceType<MidiClass>;

// `@tonejs/midi` ships a CommonJS build as `main`. Node's ESM loader exposes
// it only as `default`, while Metro's interop exposes the named export, so
// read the class from whichever the runtime provides.
const Midi: MidiClass =
  toneMidi.Midi ??
  (toneMidi as unknown as { default: { Midi: MidiClass } }).default.Midi;

/** Reads a Standard MIDI File; bytes that are not one give undefined. Never throws. */
export const readMidiFile = (
  bytes: ArrayLike<number>,
): ToneMidiFile | undefined => {
  try {
    return new Midi(bytes as ArrayLike<number> & ArrayBuffer);
  } catch {
    return undefined;
  }
};

/** MIDI channel 10 (index 9) is reserved for percussion by General MIDI. */
export const PERCUSSION_CHANNEL_INDEX = 9;

/**
 * The name of a track. Some exporters put a track's name in an empty track just
 * before its notes, so a track with no name of its own takes the name of an
 * empty, named track right before it; otherwise it has none.
 */
export const resolveTrackName = (
  tracks: readonly { name: string; notes: { length: number } }[],
  index: number,
): string => {
  const own = tracks[index]?.name.trim() ?? '';

  if (own !== '') {
    return own;
  }

  const before = tracks[index - 1];

  return before && before.notes.length === 0 ? before.name.trim() : '';
};
