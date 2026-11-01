import { useState } from 'react';

import { pianoCapabilities } from '../piano/piano-capabilities';
import { pitchCapabilities } from '../pitch/pitch-capabilities';
import {
  closePitchMonitor,
  openPitchMonitor,
} from '../pitch/pitch-monitor-controller';
import { usePitchMonitorOpen } from '../pitch/use-pitch';
import { recordingCapabilities } from '../recording/recording-capabilities';
import {
  toggleRecordingStrip,
  useRecordingStripOpen,
} from '../recording/recording-strip-store';
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
 * Backs the shared Practice tools control and menu: the piano, `Pitch
 * detection` and `Recording`.
 */
export const usePracticeTools = (): PracticeTools => {
  const { isOpen: isPianoOpen } = usePianoPreferences();
  const isMonitorOpen = usePitchMonitorOpen();
  const isStripOpen = useRecordingStripOpen();
  const canListen = pitchCapabilities().canListen;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const model = getPracticeToolsModel({
    piano: pianoCapabilities().canPlay ? { checked: isPianoOpen } : null,
    pitch: canListen ? { checked: isMonitorOpen } : null,
    recording: recordingCapabilities().canRecord
      ? { checked: isStripOpen }
      : null,
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
      } else if (id === 'recording') {
        // Switching it on only shows the strip; nothing records until Record
        // is pressed (design Decision 8). Off stops a running recording.
        toggleRecordingStrip();
      }
    },
  };
};
