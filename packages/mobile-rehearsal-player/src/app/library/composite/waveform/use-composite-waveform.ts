import { useEffect, useMemo, useState } from 'react';

import { resolveStemGains } from '@org/audio-mixing';

import { preparedKeyFor } from '../loading/create-stem-loader';
import { getLibraryTrack } from '../library-tracks';
import { useOptionalSessionMix } from '../mix/session-mix-store';
import { useActiveCompositeEngine } from '../playback/use-active-composite';
import { getPreparedStemStore } from '../prepared/prepared-stem-instance';
import { useComposites } from '../store/composite-store-instance';
import {
  combineCompositeWaveform,
  layCompositeStemPeaks,
  type CompositeWaveform,
  type LaidStemPeaks,
} from './composite-waveform';

/**
 * The waveform of the composite that is playing, following its session mix.
 * The stems' peaks are read from the prepared store once an engine is active
 * (every stem is prepared by then) and laid out once; a mix change only
 * recombines them. Null until then, and for a composite that is not playing.
 */
export const useCompositeWaveform = (
  compositeId: string | null,
): CompositeWaveform | null => {
  const composite = useComposites().find((item) => item.id === compositeId);
  const engine = useActiveCompositeEngine();
  const session = useOptionalSessionMix(composite);
  const [laid, setLaid] = useState<LaidStemPeaks | null>(null);
  const stems = composite?.stems;
  const id = composite?.id;
  const isLoaded = engine !== null;

  useEffect(() => {
    if (!id || !stems || !isLoaded) {
      setLaid(null);

      return undefined;
    }

    let isCurrent = true;
    const store = getPreparedStemStore();

    void Promise.all(
      stems.map(async (stem) => {
        const track = getLibraryTrack(stem.trackId);
        const peaks = track
          ? await store
              .getPeaks(
                preparedKeyFor(id, stem.id, {
                  id: track.id,
                  version: track.modifiedTime,
                }),
              )
              .catch(() => null)
          : null;

        return { stemId: stem.id, offsetMs: stem.offsetMs, peaks };
      }),
    ).then((withPeaks) => {
      if (isCurrent) {
        setLaid(layCompositeStemPeaks(withPeaks));
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [id, isLoaded, stems]);

  return useMemo(() => {
    if (!laid || !composite || !session) {
      return null;
    }

    return combineCompositeWaveform(
      laid,
      resolveStemGains(composite.stems, session.mix),
    );
  }, [composite, laid, session]);
};
