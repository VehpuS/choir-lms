import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { useRehearsalLibraryController } from '../../library/saved-rehearsal-library/use-rehearsal-library-controller';
import { appTheme } from '../../utils/theme';
import { DestinationPickerSection } from './destination-picker-section';
import { getDriveImportReviewHeaderCopy } from './screen-copy';
import { ModePickerSection } from './mode-picker-section';
import { SummaryCountsSection } from './summary-counts-section';
import { useDriveImportReviewState } from './use-drive-import-review-state';

type DriveImportReviewScreenProps = {
  controller: ReturnType<typeof useRehearsalLibraryController>;
};

export const DriveImportReviewScreen = ({
  controller,
}: DriveImportReviewScreenProps) => {
  const headerCopy = getDriveImportReviewHeaderCopy();
  const reviewState = useDriveImportReviewState({
    destinationFolders: controller.savedLibrary.files.destinationFolders,
    driveImport: controller.driveImport,
    rootFolderId: controller.savedLibrary.files.rootFolderId,
    selectedResults: controller.search.selection.selectedResults,
  });

  const exitReview = (action: () => void) => {
    controller.driveImport.reset();
    action();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{headerCopy.title}</Text>
          <Text style={styles.helper}>{headerCopy.helper}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => exitReview(controller.search.selection.edit)}
          >
            <Text style={styles.headerActionLabel}>Back to selection</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => exitReview(controller.search.selection.cancel)}
          >
            <Text style={styles.headerActionLabel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DestinationPickerSection
          destinationFolders={reviewState.destinationFolders}
          onSelectDestination={reviewState.selectDestinationFolder}
          selectedFolderId={reviewState.destinationFolderId}
        />
        {reviewState.hasFolderSelection ? (
          <ModePickerSection
            mode={reviewState.mode}
            onSelectMode={reviewState.selectMode}
          />
        ) : null}
        <SummaryCountsSection driveImportState={controller.driveImport.state} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: appTheme.colors.border,
  },
  headerActionLabel: {
    color: appTheme.colors.listMarker,
    fontSize: 14,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 20,
  },
  headerCopy: {
    gap: 4,
  },
  helper: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  screen: {
    flex: 1,
    backgroundColor: appTheme.colors.pageBackground,
  },
  title: {
    color: appTheme.colors.primaryText,
    fontSize: 20,
    fontWeight: '700',
  },
});
