import { pianoCapabilities } from './piano-capabilities';
import {
  setPianoPreferences,
  usePianoPreferences,
  type PianoPreferences,
} from './piano-preferences';

export type PianoToggleModel = {
  accessibilityLabel: string;
  selected: boolean;
  /** What pressing the control changes. */
  nextPreferences: Partial<PianoPreferences>;
};

/**
 * The open/close control shared by the tab bar, the playback screen, and the
 * viewer toolbar.
 */
export const getPianoToggleModel = (isOpen: boolean): PianoToggleModel => {
  return {
    accessibilityLabel: isOpen ? 'Close piano' : 'Open piano',
    selected: isOpen,
    nextPreferences: { isOpen: !isOpen },
  };
};

/** Null where the platform cannot play, so the control is simply absent. */
export const usePianoToggle = ():
  | (PianoToggleModel & {
      toggle: () => void;
    })
  | null => {
  const { isOpen } = usePianoPreferences();

  if (!pianoCapabilities().canPlay) {
    return null;
  }

  const model = getPianoToggleModel(isOpen);

  return {
    ...model,
    toggle: () => {
      setPianoPreferences(model.nextPreferences);
    },
  };
};
