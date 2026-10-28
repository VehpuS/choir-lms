import { pitchCapabilities } from '../../pitch/pitch-capabilities';
import { getPitchSettings, usePitchSettings } from '../../pitch/use-pitch';
import {
  getOtherOctaveToggle,
  type OtherOctaveToggleView,
} from './other-octave-toggle';

export type OtherOctaveToggle = OtherOctaveToggleView & {
  onToggle: () => void;
};

/** The toolbar's `Show other-octave matches` toggle; `undefined` when not offered. */
export const useOtherOctaveToggle = (
  isScore: boolean,
): OtherOctaveToggle | undefined => {
  const { showOtherOctave } = usePitchSettings();
  const view = getOtherOctaveToggle({
    canListen: pitchCapabilities().canListen,
    isScore,
    isOn: showOtherOctave,
  });

  return view
    ? {
        ...view,
        onToggle: () =>
          getPitchSettings().set({ showOtherOctave: !showOtherOctave }),
      }
    : undefined;
};
