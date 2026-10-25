import type {
  PartSelectionRequest,
  PdfLayout,
  SheetMusicSource,
} from '@org/audio-library-models';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { PageIndicator } from '../pdf-layout/page-indicator';
import type {
  PdfPageRequest,
  PdfPageState,
} from '../pdf-layout/pdf-page-controls-model';
import { FailureCard } from './failure-card';
import type {
  ViewerFailure,
  ViewerFailureAction,
  ViewerFailureReason,
} from './model';
import { SheetMusicSurface } from './sheet-music-surface';
import type { GoToJump } from './go-to/use-go-to';
import type { ScoreInfo } from './sheet-music-surface-types';
import type { SheetMusicDocumentState } from './use-sheet-music-document';

export type ViewerOutcome =
  | { info: ScoreInfo | null; kind: 'ready' }
  | { kind: 'failed'; reason: ViewerFailureReason };

type ViewerBodyProps = {
  failure: ViewerFailure | undefined;
  /** The PDF page (0-based) to open on, so a surface drawn again keeps the reader's place. */
  initialPage: number | undefined;
  jump: GoToJump | undefined;
  onFailed: (reason: ViewerFailureReason) => void;
  onFailureAction: (action: ViewerFailureAction) => void;
  onFitZoom: (zoom: number) => void;
  onPageChange: (state: PdfPageState) => void;
  onZoomChange: (zoom: number) => void;
  onRendered: (info: ScoreInfo | null) => void;
  outcome: ViewerOutcome | undefined;
  /** `Page 3 of 81` for an open PDF; undefined for a score. */
  pageIndicator: string | undefined;
  pageRequest: PdfPageRequest | undefined;
  pdfLayout: PdfLayout;
  selection: PartSelectionRequest | undefined;
  source: SheetMusicSource | undefined;
  state: SheetMusicDocumentState;
  zoom: number;
};

/** The area under the controls: the score, a spinner while it loads, or why it did not open. */
export const ViewerBody = ({
  failure,
  initialPage,
  jump,
  onFailed,
  onFailureAction,
  onFitZoom,
  onPageChange,
  onZoomChange,
  onRendered,
  outcome,
  pageIndicator,
  pageRequest,
  pdfLayout,
  selection,
  source,
  state,
  zoom,
}: ViewerBodyProps) => {
  if (!source) {
    return (
      <Text style={styles.message}>No sheet music can be shown here.</Text>
    );
  }

  if (failure) {
    return (
      <FailureCard
        failure={failure}
        onAction={onFailureAction}
        source={source}
      />
    );
  }

  return (
    <View style={styles.body}>
      {state.status === 'loaded' ? (
        <SheetMusicSurface
          document={state.document}
          initialPage={initialPage}
          jump={jump}
          key={`${source.id}:${source.format}`}
          onFailed={onFailed}
          onFitZoom={onFitZoom}
          onPageChange={onPageChange}
          onZoomChange={onZoomChange}
          onRendered={onRendered}
          pageRequest={pageRequest}
          pdfLayout={pdfLayout}
          selection={selection}
          zoom={zoom}
        />
      ) : null}
      {pageIndicator && outcome?.kind === 'ready' ? (
        <PageIndicator text={pageIndicator} />
      ) : null}
      {outcome?.kind !== 'ready' ? (
        <View pointerEvents="none" style={styles.loading}>
          <ActivityIndicator
            accessibilityLabel="Loading sheet music"
            color={appTheme.colors.accent}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.textMuted,
  },
});
