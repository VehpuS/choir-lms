import { PianoOverlay } from '../../piano/components/piano-overlay';
import type { PianoNoteRange } from '../../piano/components/piano-overlay';
import { PitchMonitorDock } from '../../pitch/components/pitch-monitor-dock';

type ViewerPracticeDockProps = {
  /** The shown part's range, so the keyboard opens where the score sits. */
  focusRange: PianoNoteRange | null | undefined;
  isCompact: boolean;
};

/**
 * The viewer's own pitch monitor and piano, since it paints above the shell's.
 * In a short window (a phone on its side) they are the slim row and the
 * 138-point compact keyboard, so the score keeps a usable page; the piano has
 * no Full screen button here, since the shell owns that choice.
 */
export const ViewerPracticeDock = ({
  focusRange,
  isCompact,
}: ViewerPracticeDockProps) => {
  return (
    <>
      <PitchMonitorDock presentation={isCompact ? 'slim' : 'strip'} />
      <PianoOverlay
        canGoFullScreen={false}
        focusRange={focusRange}
        presentation={isCompact ? 'compact-bar' : 'docked'}
      />
    </>
  );
};
