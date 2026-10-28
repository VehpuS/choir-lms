import { PianoOverlay } from '../../piano/components/piano-overlay';
import type { PianoNoteRange } from '../../piano/components/piano-overlay';
import { PitchMonitorDock } from '../../pitch/components/pitch-monitor-dock';

type ViewerPracticeDockProps = {
  /** The shown part's range, so the keyboard opens where the score sits. */
  focusRange: PianoNoteRange | null | undefined;
  isCompact: boolean;
};

/** The viewer's own pitch monitor and piano, since it paints above the shell's. */
export const ViewerPracticeDock = ({
  focusRange,
  isCompact,
}: ViewerPracticeDockProps) => {
  return (
    <>
      <PitchMonitorDock />
      <PianoOverlay
        focusRange={focusRange}
        // A short landscape window needs the height for the score.
        heightLimit={isCompact ? 'compact' : undefined}
      />
    </>
  );
};
