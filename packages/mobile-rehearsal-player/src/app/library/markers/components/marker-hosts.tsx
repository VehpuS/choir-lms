import { MarkerAddHost } from './marker-add-host';
import { MarkersHost } from './markers-host';

type MarkerHostsProps = {
  library: Parameters<typeof MarkersHost>[0]['library'] &
    Parameters<typeof MarkerAddHost>[0]['library'];
  playback: Parameters<typeof MarkersHost>[0]['playback'] &
    Parameters<typeof MarkerAddHost>[0]['playback'];
};

/** The markers sheet and the add-marker control, mounted once. */
export const MarkerHosts = ({ library, playback }: MarkerHostsProps) => (
  <>
    <MarkersHost library={library} playback={playback} />
    <MarkerAddHost library={library} playback={playback} />
  </>
);
