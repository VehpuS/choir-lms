import type { ComponentProps } from 'react';

import { PracticeToolsCard } from '../../../library/practice-tools/practice-tools-card/practice-tools-card';
import { PracticeToolsPanel } from '../../../library/practice-tools/practice-tools-panel';
import { useIsPianoViewerOpen } from '../../../library/piano/piano-host-store';
import { useHasPracticePanelTool } from '../../../library/practice-tools/use-practice-panel';
import { NowPlayingPane } from './now-playing-pane';

type ShellTrailingPaneProps = Omit<
  ComponentProps<typeof NowPlayingPane>,
  'miniPlayerSummary'
> & {
  /** Null while nothing plays, so there is no Now Playing pane to show. */
  miniPlayerSummary:
    | ComponentProps<typeof NowPlayingPane>['miniPlayerSummary']
    | null;
  /** The playback view covers the panel, so the tools float over it instead. */
  isPlaybackSurfaceOpen: boolean;
  playbackPositionSeconds: number;
};

/**
 * The wide-short layout's trailing side: the pitch monitor and the recording
 * strip (the practice tools panel) take the Now Playing pane's place while
 * either is on, and the pane returns when they close. Nothing at all when
 * nothing plays and no tool is on, so the content keeps the full width.
 */
export const ShellTrailingPane = ({
  isPlaybackSurfaceOpen,
  miniPlayerSummary,
  playbackPositionSeconds,
  ...paneProps
}: ShellTrailingPaneProps) => {
  const hasPanelTool = useHasPracticePanelTool();
  // The sheet music viewer mounts its own pitch monitor above the shell, so the
  // panel steps aside while it is open (one monitor, one set of listeners).
  const isViewerOpen = useIsPianoViewerOpen();

  if (hasPanelTool && !isViewerOpen) {
    // Over the playback view the panel is under the sheet, so the same tools
    // float in a small draggable card instead (follow-up F.4).
    return isPlaybackSurfaceOpen ? (
      <PracticeToolsCard
        activePlayableItem={paneProps.activePlayableItem}
        playbackPositionSeconds={playbackPositionSeconds}
      />
    ) : (
      <PracticeToolsPanel
        activePlayableItem={paneProps.activePlayableItem}
        playbackPositionSeconds={playbackPositionSeconds}
      />
    );
  }

  return miniPlayerSummary ? (
    <NowPlayingPane {...paneProps} miniPlayerSummary={miniPlayerSummary} />
  ) : null;
};
