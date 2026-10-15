import { createSheetMusicLoader } from '../sheet-music-loader';
import type {
  SheetMusicPartSelection,
  SheetMusicSource,
} from '@org/audio-library-models';
import { useKeepAwake } from 'expo-keep-awake';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SurfaceIconButton } from '../../../components/surface-icon-button';
import { appTheme } from '../../../utils/theme';
import { FailureCard } from './failure-card';
import {
  VIEWER_DEFAULT_ZOOM,
  applyPartChip,
  describeViewerFailure,
  filterViewableSources,
  resolveExternalUrl,
  stepViewerZoom,
  type ViewerFailureAction,
  type ViewerFailureReason,
} from './model';
import { PartControls } from './part-controls';
import { SourceSwitcher } from './source-switcher';
import { SheetMusicSurface } from './sheet-music-surface';
import type { ScoreInfo } from './sheet-music-surface-types';
import { useSheetMusicDocument } from './use-sheet-music-document';
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

type Outcome =
  | { info: ScoreInfo | null; kind: 'ready' }
  | { kind: 'failed'; reason: ViewerFailureReason };

/**
 * The full-screen sheet music viewer: the source switcher, the part controls
 * for MusicXML and MIDI, the score itself, zoom, and a play/pause control. It
 * loads a source only when shown and cancels the request when closed.
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

  const viewable = useMemo(() => filterViewableSources(sources), [sources]);
  const [sourceId, setSourceId] = useState(initialSourceId);
  const [zoom, setZoom] = useState(VIEWER_DEFAULT_ZOOM);
  const [chosen, setChosen] = useState<
    Record<string, SheetMusicPartSelection | undefined>
  >({});
  const [drawn, setDrawn] = useState<{
    document: unknown;
    outcome: Outcome;
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
          <SurfaceIconButton
            accessibilityLabel="Close sheet music"
            icon="close"
            onPress={onClose}
          />
        </View>
        {viewable.length > 1 && source ? (
          <SourceSwitcher
            onSelect={setSourceId}
            selectedId={source.id}
            sources={viewable}
          />
        ) : null}
        {info && info.parts.length > 0 ? (
          <PartControls info={info} onPressChip={handleChip} />
        ) : null}
        <View style={styles.body}>
          {!source ? (
            <Text style={styles.subtitle}>
              No sheet music can be shown here.
            </Text>
          ) : failure ? (
            <FailureCard
              failure={failure}
              onAction={handleFailureAction}
              source={source}
            />
          ) : (
            <>
              {state.status === 'loaded' ? (
                <SheetMusicSurface
                  document={state.document}
                  key={`${source.id}:${source.format}`}
                  onFailed={(reason) =>
                    setDrawn({
                      document: state.document,
                      outcome: { kind: 'failed', reason },
                    })
                  }
                  onRendered={(next) =>
                    setDrawn({
                      document: state.document,
                      outcome: { info: next, kind: 'ready' },
                    })
                  }
                  selection={selection}
                  zoom={zoom}
                />
              ) : null}
              {outcome?.kind !== 'ready' ? (
                <View pointerEvents="none" style={styles.loading}>
                  <ActivityIndicator
                    accessibilityLabel="Loading sheet music"
                    color={appTheme.colors.accent}
                  />
                </View>
              ) : null}
            </>
          )}
        </View>
        <ViewerToolbar
          isPlaybackToggleDisabled={isPlaybackToggleDisabled}
          isPlaying={isPlaying}
          onTogglePlayback={onTogglePlayback}
          onZoomIn={() => setZoom((current) => stepViewerZoom(current, 1))}
          onZoomOut={() => setZoom((current) => stepViewerZoom(current, -1))}
          zoom={zoom}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appTheme.space.md,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: {
    flex: 1,
    gap: appTheme.space.md,
    paddingHorizontal: appTheme.space.screenInset,
    paddingVertical: appTheme.space.lg,
    backgroundColor: appTheme.colors.bg,
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
