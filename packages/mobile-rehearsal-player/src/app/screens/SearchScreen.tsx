import { ScrollView, StyleSheet } from 'react-native';

import { SummaryCard } from '../components/SummaryCard';
import { DriveSearchResultsPanel } from '../library/components/DriveSearchResultsPanel';
import type { useRehearsalLibraryScreenController } from '../library/hooks/use-rehearsal-library-screen-controller';
import { appTheme } from '../utils/theme';
import { getSearchScreenSummaryCopy } from './screen-copy';

type SearchScreenProps = {
  libraryController: ReturnType<typeof useRehearsalLibraryScreenController>;
};

export const SearchScreen = ({ libraryController }: SearchScreenProps) => {
  const summaryCopy = getSearchScreenSummaryCopy({
    activeSearchQuery: libraryController.search.activeSearchQuery,
    resultCount: libraryController.search.totalResultCount,
  });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <SummaryCard
        body={summaryCopy.body}
        eyebrow="Search"
        title={summaryCopy.title}
      />
      <DriveSearchResultsPanel controller={libraryController} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appTheme.colors.pageBackground,
  },
  content: {
    gap: 14,
    paddingTop: 12,
    paddingBottom: 20,
  },
});
