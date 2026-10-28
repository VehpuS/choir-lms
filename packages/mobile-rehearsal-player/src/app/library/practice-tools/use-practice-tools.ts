import { useState } from 'react';

import { pianoCapabilities } from '../piano/piano-capabilities';
import {
  setPianoPreferences,
  usePianoPreferences,
} from '../piano/piano-preferences';
import {
  getPracticeToolsModel,
  type PracticeToolId,
  type PracticeToolsModel,
} from './practice-tools-model';

export type PracticeTools = {
  model: PracticeToolsModel;
  isMenuOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
  toggleTool: (id: PracticeToolId) => void;
};

/**
 * Backs the shared Practice tools control and menu. The piano row is live;
 * the `Pitch detection` row binds to the monitor's on or off state in 4.4 and
 * `Show other-octave matches` to the preference store in 4.6, so both are
 * absent (null) until then.
 */
export const usePracticeTools = (options: {
  isSheetMusicOpen: boolean;
}): PracticeTools => {
  const { isOpen: isPianoOpen } = usePianoPreferences();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const model = getPracticeToolsModel({
    piano: pianoCapabilities().canPlay ? { checked: isPianoOpen } : null,
    pitch: null,
    otherOctave: null,
    isSheetMusicOpen: options.isSheetMusicOpen,
  });

  return {
    model,
    isMenuOpen: isMenuOpen && model.isVisible,
    toggleMenu: () => setIsMenuOpen((open) => !open),
    closeMenu: () => setIsMenuOpen(false),
    toggleTool: (id) => {
      if (id === 'piano') {
        setPianoPreferences({ isOpen: !isPianoOpen });
      }
    },
  };
};
