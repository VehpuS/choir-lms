import type { useSavedTrackPlayback } from '../../playback/hooks/use-saved-track-playback';
import { LyricsEditorHost } from './lyrics-editor-host';
import { LyricsViewerHost } from './lyrics-viewer';

type LyricsHostsProps = {
  library: Parameters<typeof LyricsEditorHost>[0]['library'];
  playback: Pick<
    ReturnType<typeof useSavedTrackPlayback>,
    | 'activePlayableItem'
    | 'isPreparing'
    | 'playbackState'
    | 'toggleActivePlayback'
  >;
};

/** The lyrics editor and the lyrics peek / reading mode, mounted once. */
export const LyricsHosts = ({ library, playback }: LyricsHostsProps) => {
  return (
    <>
      <LyricsEditorHost library={library} />
      <LyricsViewerHost
        isPlaybackToggleDisabled={
          playback.activePlayableItem === null || playback.isPreparing
        }
        isPlaying={playback.playbackState === 'playing'}
        onTogglePlayback={() => {
          void playback.toggleActivePlayback();
        }}
      />
    </>
  );
};
