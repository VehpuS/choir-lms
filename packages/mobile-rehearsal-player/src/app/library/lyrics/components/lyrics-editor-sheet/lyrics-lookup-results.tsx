import type { Dispatch } from 'react';
import { StyleSheet, View } from 'react-native';

import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { appTheme } from '../../../../utils/theme';
import { FeedbackCard } from '../../../components/feedback-card';
import { LyricsCandidateList } from './lyrics-candidate-list';
import {
  getLyricsLookupFailureMessage,
  type LyricsEditorAction,
  type LyricsLookupState,
} from './model';

const DISCLOSURE_COPY =
  'Look up sends this title, the artist, and the track length to the lyrics service (lrclib.net). Nothing is saved until you press "Save".';

type LyricsLookupResultsProps = {
  dispatch: Dispatch<LyricsEditorAction>;
  lookup: LyricsLookupState;
  onAcknowledgeDisclosure: () => void;
  trackDurationMs?: number;
};

/** What sits under the Look up buttons: the disclosure, candidates, or a failure. */
export const LyricsLookupResults = ({
  dispatch,
  lookup,
  onAcknowledgeDisclosure,
  trackDurationMs,
}: LyricsLookupResultsProps) => {
  return (
    <>
      {lookup.status === 'disclosing' ? (
        <FeedbackCard
          footer={
            <View style={styles.actionRow}>
              <OutlinedActionButton
                fill
                label="Not now"
                onPress={() => {
                  dispatch({ type: 'lookup-dismissed' });
                }}
              />
              <OutlinedActionButton
                fill
                label="Continue"
                onPress={() => {
                  onAcknowledgeDisclosure();
                  dispatch({ type: 'disclosure-acknowledged' });
                }}
                variant="accent"
              />
            </View>
          }
          message={DISCLOSURE_COPY}
          size="compact"
          title="Before you look up"
        />
      ) : null}
      {lookup.status === 'candidates' ? (
        <LyricsCandidateList
          candidates={lookup.candidates}
          onChoose={(candidate) => {
            dispatch({ candidate, type: 'candidate-chosen' });
          }}
          trackDurationMs={trackDurationMs}
        />
      ) : null}
      {lookup.status === 'failed' && lookup.reason !== 'aborted' ? (
        <FeedbackCard
          footer={
            lookup.reason === 'no-results' ? undefined : (
              <OutlinedActionButton
                label="Try again"
                onPress={() => {
                  dispatch({ type: 'lookup-requested' });
                }}
              />
            )
          }
          message={getLyricsLookupFailureMessage(lookup.reason)}
          size="compact"
          title={
            lookup.reason === 'no-results' ? 'No lyrics found' : 'Lookup failed'
          }
          tone={lookup.reason === 'no-results' ? 'neutral' : 'error'}
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
});
