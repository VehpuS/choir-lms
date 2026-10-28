export const OTHER_OCTAVE_LABEL = 'Show other-octave matches';

export type OtherOctaveToggleView = {
  /** Names the setting and its state, since the button alone is not read out. */
  accessibilityLabel: string;
  isOn: boolean;
};

/**
 * The toolbar toggle for marking the sung note in other octaves too. It is a
 * setting of the score, so it is offered only beside a score (never a PDF) and
 * only where pitch detection can listen at all.
 */
export const getOtherOctaveToggle = (input: {
  canListen: boolean;
  isScore: boolean;
  isOn: boolean;
}): OtherOctaveToggleView | null => {
  if (!input.canListen || !input.isScore) {
    return null;
  }

  return {
    accessibilityLabel: `${OTHER_OCTAVE_LABEL}, ${input.isOn ? 'on' : 'off'}`,
    isOn: input.isOn,
  };
};
