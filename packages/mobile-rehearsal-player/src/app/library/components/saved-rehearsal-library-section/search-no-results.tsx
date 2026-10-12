import { StyleSheet, Text } from 'react-native';

import { appTheme } from '../../../utils/theme';
import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';
import {
  resolveSearchNoResultsMessage,
  type SearchResultCounts,
} from './browse-content-model';

type SearchNoResultsProps = {
  query: string | null;
  resultCounts: SearchResultCounts;
  view: SavedRehearsalLibraryView;
};

export const SearchNoResults = (props: SearchNoResultsProps) => {
  const message = resolveSearchNoResultsMessage(props);

  return message ? <Text style={styles.message}>{message}</Text> : null;
};

const styles = StyleSheet.create({
  message: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
    lineHeight: 20,
  },
});
