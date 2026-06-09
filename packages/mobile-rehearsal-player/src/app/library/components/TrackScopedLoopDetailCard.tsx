import type { ReactNode } from 'react';

import type { PlaylistPlaybackActionCopy } from '../utils/saved-playlist-playback-view-model';
import type { TrackScopedLoopDetailCopy } from '../utils/track-scoped-loop-view-model';
import { SavedLibraryDetailCardShell } from './SavedLibraryDetailCardShell';

type TrackScopedLoopDetailCardProps = {
  children: ReactNode;
  detailCopy: TrackScopedLoopDetailCopy;
  isMakeNewLoopDisabled: boolean;
  makeNewLoopLabel: string;
  onClose: () => void;
  onMakeNewLoop: () => void;
  onPlayOrderedTrackLoops: () => void;
  orderedPlaybackAction: PlaylistPlaybackActionCopy;
};

export const TrackScopedLoopDetailCard = ({
  children,
  detailCopy,
  isMakeNewLoopDisabled,
  makeNewLoopLabel,
  onClose,
  onMakeNewLoop,
  onPlayOrderedTrackLoops,
  orderedPlaybackAction,
}: TrackScopedLoopDetailCardProps) => {
  return (
    <SavedLibraryDetailCardShell
      body={detailCopy.body}
      closeAccessibilityLabel="Close track loop view"
      eyebrow="Track loops"
      metadataLabel={detailCopy.metadataLabel}
      onClose={onClose}
      primaryAction={{
        disabled: orderedPlaybackAction.disabled,
        label: `▶ ${orderedPlaybackAction.label}`,
        onPress: onPlayOrderedTrackLoops,
        tone: 'primary',
      }}
      secondaryAction={{
        disabled: isMakeNewLoopDisabled,
        label: makeNewLoopLabel,
        onPress: onMakeNewLoop,
        tone: 'secondary',
      }}
      title={detailCopy.title}
    >
      {children}
    </SavedLibraryDetailCardShell>
  );
};
