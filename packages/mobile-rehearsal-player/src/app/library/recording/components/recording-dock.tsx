import type { PlayableItem } from '@org/audio-library-models';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import { settingsNavigationStore } from '../../../screens/settings/settings-navigation-store';
import { usePlaybackMarkersLookup } from '../../markers/hooks/use-playback-markers';
import {
  resolvePlayableMarkersItem,
  resolveWaveformMarkers,
} from '../../markers/utils/waveform-markers';
import { getPlaybackShapingEngine } from '../../playback/shaping';
import { getMarkerContext } from '../recording-marker-context';
import { recordingCapabilities } from '../recording-capabilities';
import { getRecordingSession } from '../recording-session-instance';
import { getRecordingTransport } from '../recording-transport';
import {
  buildRecordingStartRequest,
  getRecordingOwnerForItem,
} from '../recording-start-request';
import {
  getRecordingStripModel,
  type StripAction,
} from '../recording-strip-model';
import { useRecordingStripOpen } from '../recording-strip-store';
import { getRecordingsStore } from '../recordings-store-instance';
import { RECORDING_STRIP_HEIGHT, RecordingStrip } from './recording-strip';

const MS_PER_SECOND = 1000;

const useIsStripShown = (): boolean => {
  const isOpen = useRecordingStripOpen();

  return isOpen && recordingCapabilities().canRecord;
};

const newRecordingId = () =>
  `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

type RecordingDockProps = {
  item: PlayableItem | null;
  positionSeconds: number;
};

const RecordingDockContent = ({
  item,
  positionSeconds,
}: RecordingDockProps) => {
  const session = getRecordingSession();
  const state = useSyncExternalStore(
    session.subscribe,
    session.getState,
    session.getState,
  );
  const lookup = usePlaybackMarkersLookup();
  const positionMs = positionSeconds * MS_PER_SECOND;
  // Record is pressed against the latest item and position, read at press time.
  const latest = useRef({ item, positionMs });

  latest.current = { item, positionMs };

  useEffect(() => {
    void session.refreshStorage();
  }, [session]);

  const markers = useMemo(() => {
    const resolution = item
      ? lookup?.markersFor(resolvePlayableMarkersItem(item))
      : undefined;

    return item && lookup && resolution
      ? resolveWaveformMarkers(item, resolution, lookup.filter)
      : [];
  }, [item, lookup]);
  const model = getRecordingStripModel({
    hasTrack: item !== null,
    session: state,
    markers: getMarkerContext(markers, positionMs),
  });
  const markersRef = useRef(markers);

  markersRef.current = markers;

  const record = useCallback(() => {
    void session.requestStart(async () => {
      const { item: current, positionMs: at } = latest.current;

      if (!current) {
        throw new Error('No track to record');
      }

      const existing = await getRecordingsStore().listByOwner(
        getRecordingOwnerForItem(current),
      );
      const shaping = getPlaybackShapingEngine().getState();

      return buildRecordingStartRequest({
        item: current,
        positionMs: at,
        markers: markersRef.current,
        shaping: {
          speedMultiplier:
            shaping.speed.kind === 'multiplier' ? shaping.speed.multiplier : 1,
          pitchSemitones: shaping.pitchSemitones,
          tempoSource: 'multiplier',
        },
        existingNames: existing.map((recording) => recording.name),
        id: newRecordingId(),
        createdAt: new Date().toISOString(),
        transport: getRecordingTransport() ?? undefined,
        nowMs: () => performance.now(),
      });
    });
  }, [session]);

  const onAction = useCallback(
    (action: StripAction) => {
      if (action === 'record') {
        record();
      } else if (action === 'continue') {
        void session.confirmExplanation();
      } else if (action === 'not-now' || action === 'dismiss') {
        session.dismiss();
      } else if (action === 'stop') {
        void session.stop();
      } else if (action === 'open-settings') {
        session.dismiss();
        settingsNavigationStore.open();
        settingsNavigationStore.openPage('recordings');
      }
    },
    [record, session],
  );

  return <RecordingStrip model={model} onAction={onAction} />;
};

/** The strip, only where the platform can record and the user turned the tool on. */
export const RecordingDock = (props: RecordingDockProps) => {
  return useIsStripShown() ? <RecordingDockContent {...props} /> : null;
};

/** How tall the shown strip is, or 0 when it is not shown. */
export const useRecordingDockHeight = (): number => {
  return useIsStripShown() ? RECORDING_STRIP_HEIGHT : 0;
};
