import { GoToDrawer } from './go-to';
import type { useGoTo } from './go-to/use-go-to';
import type { ScoreInfo } from './sheet-music-surface-types';

type ViewerGoToDrawerProps = {
  goTo: ReturnType<typeof useGoTo>;
  /** The drawn score, or null for a PDF or before it is drawn. */
  info: ScoreInfo | null;
};

/** The `Go to` drawer, open only while the score has bars to go to. */
export const ViewerGoToDrawer = ({ goTo, info }: ViewerGoToDrawerProps) => {
  if (!goTo.isOpen || info === null || info.bars.barCount === 0) {
    return null;
  }

  return (
    <GoToDrawer
      bars={info.bars}
      onClose={goTo.close}
      onJump={goTo.jumpTo}
      visibleParts={info.resolved.visible}
    />
  );
};
