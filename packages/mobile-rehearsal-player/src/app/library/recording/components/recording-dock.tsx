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
import {
  getSaveSheetModel,
  resolveRecordingName,
  type AutoExportState,
} from '../recording-save-sheet-model';
import { getRecordingsStore } from '../recordings-store-instance';
import {
  setRecordingMixBalanceFor,
  syncRecordingMixSaved,
} from '../overlay/recording-mix-store';
import { getOutputDeviceKey } from '../overlay/output-device-key';
import { getDeviceLatency } from '../overlay/recording-device-latency';
import { useAutoExportController } from '../export/auto-export-controller';
import { DEFAULT_EXPORT_FOLDER_NAME } from '../export/auto-export-settings';
import { useAutoExportSettings } from '../export/auto-export-settings-store';
import { requestRecordingExport } from '../export/recording-export-request';
import { requestRecordingPreview } from '../overlay/recording-preview-request';
import { RecordingSaveSheet } from './recording-save-sheet';
import { RECORDING_STRIP_HEIGHT, RecordingStrip } from './recording-strip';

const MS_PER_SECOND = 1000;

const useIsStripShown = (): boolean => {
  const isOpen = useRecordingStripOpen();

  return isOpen && recordingCapabilities().canRecord;
};

// Auto-export has no setting yet (task 10.5); until then the sheet offers to turn it on.
const AUTO_EXPORT_OFF: AutoExportState = { kind: 'off' };

const PERCENT = 100;

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
      // What the user saved with `Use for this device` for the output in use;
      // recordings already made keep the compensation they were filed with.
      const deviceLatencyMs = await getDeviceLatency(
        await getOutputDeviceKey(),
      );

      return buildRecordingStartRequest({
        appliedLatencyMs: deviceLatencyMs ?? 0,
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

  const openRecordingsSettings = useCallback(() => {
    session.dismiss();
    settingsNavigationStore.open();
    settingsNavigationStore.openPage('recordings');
  }, [session]);

  const saved = state.phase === 'stopped' ? state.savedRecording : undefined;
  const exportSettings = useAutoExportSettings();
  const { status: exportStatus } = useAutoExportController();
  // What the saved take will do: nothing, wait, or upload (with progress while it does).
  const autoExport: AutoExportState = exportSettings.enabled
    ? {
        folderName:
          exportSettings.folder?.folderName ?? DEFAULT_EXPORT_FOLDER_NAME,
        kind: 'on',
        percent:
          saved && exportStatus.running?.recordingId === saved.id
            ? Math.round(exportStatus.running.progress * PERCENT)
            : undefined,
        what: exportSettings.what,
        wifiOnly: exportSettings.uploadOver === 'wifi',
      }
    : AUTO_EXPORT_OFF;

  const renameSaved = useCallback(
    (typed: string) => {
      if (!saved) {
        return;
      }

      const name = resolveRecordingName(typed, saved.name);

      if (name !== saved.name) {
        void getRecordingsStore().update(saved.id, { name });
      }
    },
    [saved],
  );

  const setSavedBalance = useCallback(
    (balance: number) => {
      if (saved && balance !== saved.balance) {
        void getRecordingsStore()
          .update(saved.id, { balance })
          .then(() => syncRecordingMixSaved(saved.id, balance));
      }
    },
    [saved],
  );

  const deleteSaved = useCallback(() => {
    if (saved) {
      void getRecordingsStore().delete(saved.id);
    }

    session.dismiss();
  }, [saved, session]);

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
        openRecordingsSettings();
      }
    },
    [openRecordingsSettings, record, session],
  );

  return (
    <>
      <RecordingStrip model={model} onAction={onAction} />
      {saved ? (
        <RecordingSaveSheet
          key={saved.id}
          model={getSaveSheetModel({
            recording: saved,
            autoExport,
            stop: state.stopMessage,
          })}
          balance={saved.balance}
          name={saved.name}
          onDelete={deleteSaved}
          onDone={session.dismiss}
          onExport={() => {
            requestRecordingExport({ recordingIds: [saved.id] });
            session.dismiss();
          }}
          onRename={renameSaved}
          onPreview={(balance) =>
            requestRecordingPreview({
              kind: 'play',
              recordingId: saved.id,
              balance,
            })
          }
          onPreviewBalanceChange={(balance) =>
            setRecordingMixBalanceFor(saved.id, balance)
          }
          onSetBalance={setSavedBalance}
          onStopPreview={() =>
            requestRecordingPreview({ kind: 'stop', recordingId: saved.id })
          }
          onTurnOnAutoExport={openRecordingsSettings}
        />
      ) : null}
    </>
  );
};

/** The strip, only where the platform can record and the user turned the tool on. */
export const RecordingDock = (props: RecordingDockProps) => {
  return useIsStripShown() ? <RecordingDockContent {...props} /> : null;
};

/** How tall the shown strip is, or 0 when it is not shown. */
export const useRecordingDockHeight = (): number => {
  return useIsStripShown() ? RECORDING_STRIP_HEIGHT : 0;
};
