import { useState } from 'react';

import { useLayoutClass } from '../../routing/shell/layout-class';
import { useActiveCompositeEngine } from '../composite/playback/use-active-composite';
import { pianoCapabilities } from '../piano/piano-capabilities';
import { resolvePianoPresentation } from '../piano/piano-overlay-model';
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
export const usePracticeTools = ({
  isOverPlaybackView = false,
}: {
  /** Over the playback view in wide-short the piano is always full screen. */
  isOverPlaybackView?: boolean;
} = {}): PracticeTools => {
  const { isFullScreen, isOpen: isPianoOpen } = usePianoPreferences();
  const layoutClass = useLayoutClass();
  const isMonitorOpen = usePitchMonitorOpen();
  const isStripOpen = useRecordingStripOpen();
  // Recording follows the media element's clock, which a composite does not
  // have, so the entry is hidden while a composite is playing (design Decision 5).
  const isCompositeActive = useActiveCompositeEngine() !== null;
  const canListen = pitchCapabilities().canListen;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const model = getPracticeToolsModel({
    piano: pianoCapabilities().canPlay ? { checked: isPianoOpen } : null,
    pitch: canListen ? { checked: isMonitorOpen } : null,
    recording:
      recordingCapabilities().canRecord && !isCompositeActive
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

        // A piano that opens full screen covers the menu, which would be left
        // open underneath until the piano is left; close it now.
        if (
          !isPianoOpen &&
          resolvePianoPresentation(
            layoutClass,
            isFullScreen || isOverPlaybackView,
          ) === 'fullscreen'
        ) {
          setIsMenuOpen(false);
        }
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
