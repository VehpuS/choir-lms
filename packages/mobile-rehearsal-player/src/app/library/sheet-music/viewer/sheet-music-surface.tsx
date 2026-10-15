import { useEffect } from 'react';

import type { SheetMusicSurfaceProps } from './sheet-music-surface-types';

/**
 * Native has no sheet music renderer in this change; the web file draws the
 * score. The viewer shows its "not shown on this device yet" message with a
 * way to open the source outside the app (native-playback-follow-ups 1.6).
 */
export const SheetMusicSurface = ({ onFailed }: SheetMusicSurfaceProps) => {
  useEffect(() => {
    onFailed('unsupported-platform');
    // The failure is reported once, when the surface appears.
  }, []);

  return null;
};
