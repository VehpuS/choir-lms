import type {
  SheetMusicPartSelection,
  SheetMusicSource,
} from '@org/audio-library-models';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
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
  jump: GoToJump | undefined;
  onFailed: (reason: ViewerFailureReason) => void;
  onFailureAction: (action: ViewerFailureAction) => void;
  onFitZoom: (zoom: number) => void;
  onRendered: (info: ScoreInfo | null) => void;
  outcome: ViewerOutcome | undefined;
  selection: SheetMusicPartSelection | undefined;
  source: SheetMusicSource | undefined;
  state: SheetMusicDocumentState;
  zoom: number;
};

/** The area under the controls: the score, a spinner while it loads, or why it did not open. */
export const ViewerBody = ({
  failure,
  jump,
  onFailed,
  onFailureAction,
  onFitZoom,
  onRendered,
  outcome,
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
          jump={jump}
          key={`${source.id}:${source.format}`}
          onFailed={onFailed}
          onFitZoom={onFitZoom}
          onRendered={onRendered}
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
