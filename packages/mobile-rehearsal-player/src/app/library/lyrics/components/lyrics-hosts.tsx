import { LyricsEditorHost } from './lyrics-editor-host';
import { LyricsViewerHost } from './lyrics-viewer';

type LyricsHostsProps = {
  library: Parameters<typeof LyricsEditorHost>[0]['library'];
  playback: Parameters<typeof LyricsViewerHost>[0];
};

/** The lyrics editor and the lyrics peek / reading mode, mounted once. */
export const LyricsHosts = ({ library, playback }: LyricsHostsProps) => {
  return (
    <>
      <LyricsEditorHost library={library} />
      <LyricsViewerHost {...playback} />
    </>
  );
};
