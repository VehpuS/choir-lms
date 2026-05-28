import { ScrollView, StyleSheet } from 'react-native';

import { DriveSearchResultsPanel } from '../library/components/DriveSearchResultsPanel';
import type { useRehearsalLibraryScreenController } from '../library/hooks/use-rehearsal-library-screen-controller';
import { appTheme } from '../utils/theme';

type SearchScreenProps = {
  libraryController: ReturnType<typeof useRehearsalLibraryScreenController>;
};

export const SearchScreen = ({ libraryController }: SearchScreenProps) => {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
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
