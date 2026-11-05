import { RecordingAutoExportHost } from './recording-auto-export-host';
import { RecordingInterruptedHost } from './recording-interrupted-host';
import { RecordingExportHost } from './recording-export-host';
import { RecordingOverlayHost } from '../overlay/recording-overlay-host';
import { RecordingPreviewHost } from '../overlay/recording-preview-host';
import { RecordingsHost } from './recordings-host';

type RecordingHostsProps = {
  authorization: Parameters<typeof RecordingExportHost>[0]['authorization'];
  library: Parameters<typeof RecordingsHost>[0]['library'];
  playlists: Parameters<typeof RecordingsHost>[0]['playlists'];
  playback: Parameters<typeof RecordingsHost>[0]['playback'] &
    Parameters<typeof RecordingOverlayHost>[0]['playback'] &
    Parameters<typeof RecordingPreviewHost>[0]['playback'];
};

/** Everything the router hosts for recordings: the panel, the overlay sound, and balance previews. */
export const RecordingHosts = ({
  authorization,
  library,
  playback,
  playlists,
}: RecordingHostsProps) => (
  <>
    <RecordingsHost
      library={library}
      playback={playback}
      playlists={playlists}
    />
    <RecordingExportHost authorization={authorization} library={library} />
    <RecordingInterruptedHost />
    <RecordingAutoExportHost authorization={authorization} library={library} />
    <RecordingOverlayHost playback={playback} />
    <RecordingPreviewHost library={library} playback={playback} />
  </>
);
