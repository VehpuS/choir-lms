import {
  resolvePartSelection,
  type SheetMusicPartSelection,
  type SheetMusicSource,
} from '@org/audio-library-models';
import { useKeepAwake } from 'expo-keep-awake';
import { useMemo, useRef, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { SurfaceIconButton } from '../../../components/surface-icon-button';
import { createSheetMusicLoader } from '../sheet-music-loader';
import { GoToDrawer } from './go-to';
import { useGoTo } from './go-to/use-go-to';
import { isCompactViewerHeight } from './layout-model';
import {
  applyPartChip,
  describeViewerFailure,
  filterViewableSources,
  hasPartChoice,
  resolveExternalUrl,
  type ViewerFailureAction,
} from './model';
import { PartChips, PartNotices } from './part-chips';
import {
  buildMyPartChip,
  learnPartName,
  resolveRequestedSelection,
} from '../my-parts/my-parts-model';
import {
  updateMyPartsPreferences,
  useMyPartsPreferences,
} from '../my-parts/my-parts-store';
import { SourceChips } from './source-chips';
import { useSheetMusicDocument } from './use-sheet-music-document';
import { ViewerBody, type ViewerOutcome } from './viewer-body';
import { useViewerZoom } from './use-viewer-zoom';
import { ViewerLayout } from './viewer-layout';
import { ViewerToolbar } from './viewer-toolbar';

// Reading music means holding the phone or tablet up, so the screen stays on
// while the viewer is open; the hook releases the lock when it unmounts.
const KEEP_AWAKE_TAG = 'sheet-music-viewer';

type SheetMusicViewerProps = {
  /** The current Drive access token, or undefined when Drive is not connected. */
  getDriveAccessToken: () => string | undefined;
  initialSourceId: string;
  isPlaybackToggleDisabled: boolean;
  isPlaying: boolean;
  onChangePartSelection: (
    sourceId: string,
    selection: SheetMusicPartSelection,
  ) => void;
  onClose: () => void;
  onOpenExternal: (url: string) => void;
  onReconnectDrive: () => void;
  onTogglePlayback: () => void;
  /** The owning track's name. */
  ownerName: string;
  sources: readonly SheetMusicSource[];
};

/**
 * The full-screen sheet music viewer: the source switcher, the part controls
 * for MusicXML and MIDI, the score itself, zoom, and a play/pause control. It
 * loads a source only when shown and cancels the request when closed.
 *
 * A phone held sideways is too short for a header, two chip rows, and a
 * toolbar above the score, so below a height limit the controls move into a
 * slim rail beside the score and the chips share one row.
 */
export const SheetMusicViewer = ({
  getDriveAccessToken,
  initialSourceId,
  isPlaybackToggleDisabled,
  isPlaying,
  onChangePartSelection,
  onClose,
  onOpenExternal,
  onReconnectDrive,
  onTogglePlayback,
  ownerName,
  sources,
}: SheetMusicViewerProps) => {
  useKeepAwake(KEEP_AWAKE_TAG);

  const isCompact = isCompactViewerHeight(useWindowDimensions().height);
  const viewable = useMemo(() => filterViewableSources(sources), [sources]);
  const [sourceId, setSourceId] = useState(initialSourceId);
  const [chosen, setChosen] = useState<
    Record<string, SheetMusicPartSelection | undefined>
  >({});
  const [drawn, setDrawn] = useState<{
    document: unknown;
    outcome: ViewerOutcome;
  }>();
  const source = viewable.find(({ id }) => id === sourceId) ?? viewable[0];
  const myParts = useMyPartsPreferences();
  const ownSelection = source
    ? source.id in chosen
      ? chosen[source.id]
      : source.partSelection
    : undefined;
  // Memoized: the surface redraws whenever the selection's identity changes,
  // so a fresh `{ preferVoice }` object per render would redraw forever.
  const selection = useMemo(
    () => resolveRequestedSelection(ownSelection, myParts),
    [ownSelection, myParts],
  );

  // The loader reads the token when a request starts, so a Drive reconnection
  // is picked up by `Try again` without rebuilding it.
  const tokenReader = useRef(getDriveAccessToken);

  tokenReader.current = getDriveAccessToken;

  const loader = useMemo(
    () =>
      createSheetMusicLoader({
        checksCors: Platform.OS === 'web',
        fetch: (input, init) => fetch(input, init),
        getDriveAccessToken: () => tokenReader.current(),
      }),
    [],
  );
  const { retry, state } = useSheetMusicDocument(source, loader);
  const outcome =
    state.status === 'loaded' && drawn?.document === state.document
      ? drawn.outcome
      : undefined;
  const failureReason =
    state.status === 'failed'
      ? state.reason
      : outcome?.kind === 'failed'
        ? outcome.reason
        : undefined;
  const failure =
    source && failureReason
      ? describeViewerFailure(failureReason, source)
      : undefined;
  const info = outcome?.kind === 'ready' ? outcome.info : null;
  const viewerZoom = useViewerZoom(info !== null);
  const goTo = useGoTo();
  const canGoTo = info !== null && info.bars.barCount > 0;
  const hasParts = info !== null && hasPartChoice(info.parts);
  const hasSwitcher = viewable.length > 1 && source !== undefined;

  const handleFailureAction = (action: ViewerFailureAction) => {
    if (action === 'reconnect-drive') {
      onReconnectDrive();
    } else if (action === 'try-again') {
      retry();
    } else if (source) {
      onOpenExternal(resolveExternalUrl(source));
    }
  };

  const handleChip = (key: string) => {
    if (!source || !info) {
      return;
    }

    const next = applyPartChip(info.parts, info.resolved, key);

    if (next === undefined) {
      return;
    }

    setChosen((current) => ({ ...current, [source.id]: next }));
    onChangePartSelection(source.id, next);

    // Using the chips is what teaches the app a singer's line: remember it when
    // exactly one part is left showing.
    const learned = learnPartName(
      resolvePartSelection(info.parts, next).visible,
    );

    if (learned) {
      updateMyPartsPreferences({ latestPart: learned });
    }
  };

  const sourceChips = hasSwitcher ? (
    <SourceChips
      onSelect={setSourceId}
      selectedId={source.id}
      sources={viewable}
    />
  ) : null;
  const partChips = hasParts ? (
    <PartChips
      info={info}
      myPart={buildMyPartChip(info.resolved.visible, myParts.parts)}
      onPressChip={handleChip}
      onPressMyPart={(chip) =>
        updateMyPartsPreferences({ parts: chip.nextParts })
      }
    />
  ) : null;
  const body = (
    <ViewerBody
      failure={failure}
      jump={goTo.jump}
      onFailed={(reason) =>
        setDrawn({
          document: state.status === 'loaded' ? state.document : undefined,
          outcome: { kind: 'failed', reason },
        })
      }
      onFailureAction={handleFailureAction}
      onFitZoom={viewerZoom.onFitZoom}
      onRendered={(next) =>
        setDrawn({
          document: state.status === 'loaded' ? state.document : undefined,
          outcome: { info: next, kind: 'ready' },
        })
      }
      outcome={outcome}
      selection={selection}
      source={source}
      state={state}
      zoom={viewerZoom.zoom}
    />
  );
  const drawer =
    goTo.isOpen && canGoTo ? (
      <GoToDrawer
        bars={info.bars}
        onClose={goTo.close}
        onJump={goTo.jumpTo}
        visibleParts={info.resolved.visible}
      />
    ) : null;
  const toolbar = (orientation: 'column' | 'row') => (
    <ViewerToolbar
      isPlaybackToggleDisabled={isPlaybackToggleDisabled}
      isPlaying={isPlaying}
      onTogglePlayback={onTogglePlayback}
      isFitted={viewerZoom.isFitted}
      onFit={info ? viewerZoom.fit : undefined}
      onGoTo={canGoTo ? goTo.open : undefined}
      onZoomIn={viewerZoom.zoomIn}
      onZoomOut={viewerZoom.zoomOut}
      orientation={orientation}
      zoom={viewerZoom.zoom}
    />
  );
  const closeButton = (
    <SurfaceIconButton
      accessibilityLabel="Close sheet music"
      icon="close"
      onPress={onClose}
    />
  );

  return (
    <ViewerLayout
      body={
        <>
          {body}
          {drawer}
        </>
      }
      closeButton={closeButton}
      isCompact={isCompact}
      notices={hasParts ? <PartNotices info={info} /> : null}
      onClose={onClose}
      ownerName={ownerName}
      partChips={partChips}
      sourceChips={sourceChips}
      sourceLabel={source?.label}
      toolbar={toolbar}
    />
  );
};
