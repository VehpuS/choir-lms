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
