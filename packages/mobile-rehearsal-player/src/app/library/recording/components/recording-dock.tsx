import {
  getRecordingLevelDb,
  type PlayableItem,
} from '@org/audio-library-models';
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
import { getMarkerContext } from '../recording-marker-context';
import { recordingCapabilities } from '../recording-capabilities';
import {
  armPunch,
  closePunchSheet,
  disarmPunch,
  openPunchSheet,
  playPunchFromPreRoll,
  usePunchSheetOpen,
  usePunchState,
} from '../punch/punch-instance';
import { formatPunchTime, getNearestMarkerName } from '@org/audio-mixing';
import { getPunchSpanText } from '../punch/punch-sheet-model';
import { PunchSheet } from '../punch/punch-sheet';
import { loopOf, usePunchTrackDuration } from '../punch/use-punch-track';
import { getRecordingSession } from '../recording-session-instance';
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
import { useAutoExportController } from '../export/auto-export-controller';
import { DEFAULT_EXPORT_FOLDER_NAME } from '../export/auto-export-settings';
import { useAutoExportSettings } from '../export/auto-export-settings-store';
import { requestRecordingExport } from '../export/recording-export-request';
import { useRecordingStarter } from './use-recording-starter';
import { useSavedRecordingMix } from './use-saved-recording-mix';
import { RecordingSaveSheet } from './recording-save-sheet';
import {
  RECORDING_STRIP_HEIGHT,
  RecordingStrip,
  type RecordingStripPresentation,
} from './recording-strip';

const MS_PER_SECOND = 1000;

/** Whether the recording tool is on and the platform can record. */
export const useIsRecordingStripShown = (): boolean => {
  const isOpen = useRecordingStripOpen();

  return isOpen && recordingCapabilities().canRecord;
};

// Auto-export has no setting yet (task 10.5); until then the sheet offers to turn it on.
const AUTO_EXPORT_OFF: AutoExportState = { kind: 'off' };

const PERCENT = 100;

type RecordingDockProps = {
  item: PlayableItem | null;
  positionSeconds: number;
  /** `panel` draws the strip for the wide-short layout's trailing panel. */
  presentation?: RecordingStripPresentation;
};

const RecordingDockContent = ({
  item,
  positionSeconds,
  presentation,
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
  const punchState = usePunchState();
  const isPunchSheetOpen = usePunchSheetOpen();
  const trackDurationMs = usePunchTrackDuration(isPunchSheetOpen);
  const model = getRecordingStripModel({
    hasTrack: item !== null,
    session: state,
    markers: getMarkerContext(markers, positionMs),
    punch: punchState.range
      ? {
          outLabel:
            getNearestMarkerName(punchState.range.outMs, markers) ??
            formatPunchTime(punchState.range.outMs),
          span: getPunchSpanText(
            punchState.range.inMs,
            punchState.range.outMs,
            markers,
          ),
          state: punchState,
        }
      : undefined,
  });
  const itemId = item?.id;

  // A punch take that stopped for another reason, or never started, ends the punch.
  const sessionPhase = state.phase;

  useEffect(() => {
    if (
      punchState.phase === 'recording' &&
      (sessionPhase === 'stopped' ||
        sessionPhase === 'blocked' ||
        sessionPhase === 'refused')
    ) {
      disarmPunch();
    }
  }, [punchState.phase, sessionPhase]);

  // A punch range belongs to the track it was set on.
  useEffect(() => {
    disarmPunch();
    closePunchSheet();
  }, [itemId]);
  const markersRef = useRef(markers);

  markersRef.current = markers;

  const { record, startPunchTake } = useRecordingStarter({
    latest,
    markersRef,
    session,
  });

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

  const savedMix = useSavedRecordingMix(saved);

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
        // Stopping a punch take ends the punch too, so playback is not paused later.
        disarmPunch();
        void session.stop();
      } else if (action === 'open-settings') {
        openRecordingsSettings();
      } else if (action === 'record-between') {
        openPunchSheet();
      } else if (action === 'play-punch') {
        playPunchFromPreRoll();
      } else if (action === 'disarm') {
        disarmPunch();
      }
    },
    [openRecordingsSettings, record, session],
  );

  return (
    <>
      <RecordingStrip
        model={model}
        onAction={onAction}
        presentation={presentation}
      />
      {isPunchSheetOpen && item && trackDurationMs > 0 ? (
        <PunchSheet
          activeLoop={loopOf(item)}
          durationMs={trackDurationMs}
          item={item}
          markers={markers}
          onArm={(range) => {
            closePunchSheet();
            session.dismiss();
            void session.afterExplanation(() => {
              armPunch(range, {
                start: () => startPunchTake(range),
                stop: (reason) => void session.stop(reason),
              });
            });
          }}
          onClose={closePunchSheet}
          positionMs={positionMs}
        />
      ) : null}
      {saved ? (
        <RecordingSaveSheet
          key={saved.id}
          model={getSaveSheetModel({
            recording: saved,
            autoExport,
            stop: state.stopMessage,
          })}
          balance={saved.balance}
          levelDb={getRecordingLevelDb(saved)}
          recordingId={saved.id}
          name={saved.name}
          onDelete={deleteSaved}
          onDone={session.dismiss}
          onExport={() => {
            requestRecordingExport({ recordingIds: [saved.id] });
            session.dismiss();
          }}
          onRename={renameSaved}
          onPreview={savedMix.preview}
          onPreviewMixChange={savedMix.changeMix}
          onSetMix={savedMix.setSavedMix}
          onStopPreview={savedMix.stopPreview}
          onTurnOnAutoExport={openRecordingsSettings}
        />
      ) : null}
    </>
  );
};

/** The strip, only where the platform can record and the user turned the tool on. */
export const RecordingDock = (props: RecordingDockProps) => {
  return useIsRecordingStripShown() ? (
    <RecordingDockContent {...props} />
  ) : null;
};

/** How tall the shown strip is, or 0 when it is not shown. */
export const useRecordingDockHeight = (): number => {
  return useIsRecordingStripShown() ? RECORDING_STRIP_HEIGHT : 0;
};
