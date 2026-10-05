import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DriveSessionMenu } from '../../auth/google-drive/components/drive-session-menu';
import type { DriveSessionMenuController } from '../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import { DestinationHeader } from '../../components/destination-header';
import { OutlinedActionButton } from '../../components/outlined-action-button';
import type { useRehearsalLibraryController } from '../../library/saved-rehearsal-library/use-rehearsal-library-controller';
import { appTheme } from '../../utils/theme';
import { DestinationPickerSection } from './destination-picker-section';
import { resolveDriveImportReviewHeaderMode } from './drive-import-progress-model';
import { getDriveImportReviewHeaderCopy } from './screen-copy';
import { ModePickerSection } from './mode-picker-section';
import { SummaryCountsSection } from './summary-counts-section';
import { useDriveImportReviewState } from './use-drive-import-review-state';
import { scrollGutterStyles } from '../../components/scroll-gutter';

type DriveImportReviewScreenProps = {
  authorization: DriveSessionMenuController;
  controller: ReturnType<typeof useRehearsalLibraryController>;
};

export const DriveImportReviewScreen = ({
  authorization,
  controller,
}: DriveImportReviewScreenProps) => {
  const [isSessionMenuVisible, setIsSessionMenuVisible] = useState(false);
  const headerCopy = getDriveImportReviewHeaderCopy();
  const reviewState = useDriveImportReviewState({
    destinationFolders: controller.savedLibrary.files.destinationFolders,
    driveImport: controller.driveImport,
    rootFolderId: controller.savedLibrary.files.rootFolderId,
    selectedResults: controller.search.selection.selectedResults,
  });
  const driveImportState = controller.driveImport.state;
  const headerMode = resolveDriveImportReviewHeaderMode(
    driveImportState.status,
  );

  const exitReview = (action: () => void) => {
    setIsSessionMenuVisible(false);
    controller.driveImport.reset();
    action();
  };

  return (
    <View style={styles.screen}>
      {isSessionMenuVisible ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsSessionMenuVisible(false)}
          style={styles.menuBackdrop}
        />
      ) : null}
      <DestinationHeader
        style={styles.destinationHeader}
        subtitle={headerCopy.helper}
        title={headerCopy.title}
        trailingAction={
          <DriveSessionMenu
            authState={authorization.authState}
            canClearAuthorization={authorization.canClearAuthorization}
            canStartAuthorization={authorization.canStartAuthorization}
            isBusy={authorization.isBusy}
            isVisible={isSessionMenuVisible}
            onClearAuthorization={() => {
              setIsSessionMenuVisible(false);
              void authorization.clearAuthorization();
            }}
            onStartAuthorization={() => {
              setIsSessionMenuVisible(false);
              void authorization.startAuthorization();
            }}
            onToggleVisibility={() => {
              setIsSessionMenuVisible((currentValue) => !currentValue);
            }}
            requestReady={authorization.requestReady}
            statusCopy={authorization.statusCopy}
          />
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, scrollGutterStyles.content]}
        showsVerticalScrollIndicator={false}
        style={scrollGutterStyles.scrollView}
      >
        {headerMode === 'default' ? (
          <>
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
          </>
        ) : null}
        <SummaryCountsSection
          driveImportState={driveImportState}
          onRetryFailed={() => controller.driveImport.retry()}
        />
      </ScrollView>
      <View style={styles.footer}>
        {headerMode === 'default' ? (
          <>
            <OutlinedActionButton
              label="Back"
              onPress={() => exitReview(controller.search.selection.edit)}
            />
            <OutlinedActionButton
              label="Cancel"
              onPress={() => exitReview(controller.search.selection.cancel)}
            />
            {driveImportState.status === 'review' ? (
              <OutlinedActionButton
                fill
                label="Confirm import"
                onPress={() => controller.driveImport.execute()}
                variant="accent"
              />
            ) : null}
          </>
        ) : null}
        {headerMode === 'executing' ? (
          <OutlinedActionButton
            fill
            label="Cancel import"
            onPress={() => controller.driveImport.cancel()}
            variant="accent"
          />
        ) : null}
        {headerMode === 'completed' ? (
          <OutlinedActionButton
            fill
            label="Dismiss"
            onPress={() => exitReview(controller.search.selection.cancel)}
            variant="accent"
          />
        ) : null}
      </View>
    </View>
  );
};

// Review sits on the ground like Add (screen 1e), with sections separated by
// space and kickers, and 1h's pinned outlined-action footer.
const styles = StyleSheet.create({
  content: {
    gap: appTheme.space.xl,
    paddingTop: appTheme.space.xl,
    paddingBottom: appTheme.space.xl,
  },
  destinationHeader: {
    marginTop: appTheme.space.md,
  },
  footer: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
    paddingTop: appTheme.space.sm,
    paddingBottom: appTheme.space.xxs,
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.hairline,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  screen: {
    flex: 1,
    backgroundColor: appTheme.colors.bg,
  },
});
