import type {
  SheetMusicPartSelection,
  SheetMusicSource,
} from '@org/audio-library-models';
import { useKeepAwake } from 'expo-keep-awake';
import { useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { SurfaceIconButton } from '../../../components/surface-icon-button';
import { appTheme } from '../../../utils/theme';
import { createSheetMusicLoader } from '../sheet-music-loader';
import { ChipRow } from './chip-row';
import { isCompactViewerHeight } from './layout-model';
import {
  VIEWER_DEFAULT_ZOOM,
  applyPartChip,
  describeViewerFailure,
  filterViewableSources,
  resolveExternalUrl,
  stepViewerZoom,
  type ViewerFailureAction,
} from './model';
import { ChipDivider, PartChips, PartNotices } from './part-chips';
import { SourceChips } from './source-chips';
import { useSheetMusicDocument } from './use-sheet-music-document';
import { ViewerBody, type ViewerOutcome } from './viewer-body';
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
  const [zoom, setZoom] = useState(VIEWER_DEFAULT_ZOOM);
  const [chosen, setChosen] = useState<
    Record<string, SheetMusicPartSelection | undefined>
  >({});
  const [drawn, setDrawn] = useState<{
    document: unknown;
    outcome: ViewerOutcome;
  }>();
  const source = viewable.find(({ id }) => id === sourceId) ?? viewable[0];
  const selection = source
    ? source.id in chosen
      ? chosen[source.id]
      : source.partSelection
    : undefined;

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
  const hasParts = info !== null && info.parts.length > 0;
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
  };

  const sourceChips = hasSwitcher ? (
    <SourceChips
      onSelect={setSourceId}
      selectedId={source.id}
      sources={viewable}
    />
  ) : null;
  const partChips = hasParts ? (
    <PartChips info={info} onPressChip={handleChip} />
  ) : null;
  const body = (
    <ViewerBody
      failure={failure}
      onFailed={(reason) =>
        setDrawn({
          document: state.status === 'loaded' ? state.document : undefined,
          outcome: { kind: 'failed', reason },
        })
      }
      onFailureAction={handleFailureAction}
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
      zoom={zoom}
    />
  );
  const toolbar = (orientation: 'column' | 'row') => (
    <ViewerToolbar
      isPlaybackToggleDisabled={isPlaybackToggleDisabled}
      isPlaying={isPlaying}
      onTogglePlayback={onTogglePlayback}
      onZoomIn={() => setZoom((current) => stepViewerZoom(current, 1))}
      onZoomOut={() => setZoom((current) => stepViewerZoom(current, -1))}
      orientation={orientation}
      zoom={zoom}
    />
  );
  const closeButton = (
    <SurfaceIconButton
      accessibilityLabel="Close sheet music"
      icon="close"
      onPress={onClose}
    />
  );

  if (isCompact) {
    return (
      <Modal animationType="slide" onRequestClose={onClose} visible>
        <View style={[styles.screen, styles.screenCompact]}>
          <View style={styles.compactMain}>
            {sourceChips || partChips ? (
              <ChipRow accessibilityLabel="Sources and parts">
                {sourceChips}
                {sourceChips && partChips ? <ChipDivider /> : null}
                {partChips}
              </ChipRow>
            ) : source ? (
              <Text numberOfLines={1} style={styles.subtitle}>
                {`${ownerName} · ${source.label}`}
              </Text>
            ) : null}
            {info ? <PartNotices info={info} /> : null}
            <View style={styles.body}>{body}</View>
          </View>
          <View style={styles.rail}>
            {closeButton}
            {toolbar('column')}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.titles}>
            <Text numberOfLines={1} style={styles.title}>
              {ownerName}
            </Text>
            {source ? (
              <Text numberOfLines={1} style={styles.subtitle}>
                {source.label}
              </Text>
            ) : null}
          </View>
          {closeButton}
        </View>
        {sourceChips ? (
          <ChipRow accessibilityLabel="Sheet music sources">
            {sourceChips}
          </ChipRow>
        ) : null}
        {partChips ? (
          <ChipRow accessibilityLabel="Parts">{partChips}</ChipRow>
        ) : null}
        {info ? <PartNotices info={info} /> : null}
        <View style={styles.body}>{body}</View>
        {toolbar('row')}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  compactMain: {
    flex: 1,
    gap: appTheme.space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appTheme.space.md,
  },
  rail: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screen: {
    flex: 1,
    gap: appTheme.space.md,
    paddingHorizontal: appTheme.space.screenInset,
    paddingVertical: appTheme.space.lg,
    backgroundColor: appTheme.colors.bg,
  },
  screenCompact: {
    flexDirection: 'row',
    paddingVertical: appTheme.space.sm,
  },
  subtitle: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.textMuted,
  },
  title: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
  titles: {
    flex: 1,
  },
});
