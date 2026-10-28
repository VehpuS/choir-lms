import { useState } from 'react';

import { pianoCapabilities } from '../piano/piano-capabilities';
import { pitchCapabilities } from '../pitch/pitch-capabilities';
import {
  closePitchMonitor,
  openPitchMonitor,
} from '../pitch/pitch-monitor-controller';
import { usePitchMonitorOpen } from '../pitch/use-pitch';
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
 * Backs the shared Practice tools control and menu. The piano and `Pitch
 * detection` rows are live; `Show other-octave matches` binds to the
 * preference store in 4.6, so it is absent (null) until then.
 */
export const usePracticeTools = (options: {
  isSheetMusicOpen: boolean;
}): PracticeTools => {
  const { isOpen: isPianoOpen } = usePianoPreferences();
  const isMonitorOpen = usePitchMonitorOpen();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const model = getPracticeToolsModel({
    piano: pianoCapabilities().canPlay ? { checked: isPianoOpen } : null,
    pitch: pitchCapabilities().canListen ? { checked: isMonitorOpen } : null,
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
      } else if (id === 'pitch') {
        // Switching it on starts listening; off stops it (design Decision 6).
        (isMonitorOpen ? closePitchMonitor : openPitchMonitor)();
      }
    },
  };
};
