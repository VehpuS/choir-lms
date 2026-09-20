import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DriveSessionMenu } from '../../auth/google-drive/components/drive-session-menu';
import type { DriveSessionMenuController } from '../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import { DestinationHeader } from '../../components/destination-header';
import type { useRehearsalLibraryController } from '../../library/saved-rehearsal-library/use-rehearsal-library-controller';
import { appTheme } from '../../utils/theme';
import { DestinationPickerSection } from './destination-picker-section';
import { resolveDriveImportReviewHeaderMode } from './drive-import-progress-model';
import { getDriveImportReviewHeaderCopy } from './screen-copy';
import { ModePickerSection } from './mode-picker-section';
import { SummaryCountsSection } from './summary-counts-section';
import { useDriveImportReviewState } from './use-drive-import-review-state';

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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
            <Pressable
              accessibilityRole="button"
              onPress={() => exitReview(controller.search.selection.edit)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonLabel}>Back</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => exitReview(controller.search.selection.cancel)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonLabel}>Cancel</Text>
            </Pressable>
            {driveImportState.status === 'review' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => controller.driveImport.execute()}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonLabel}>Confirm import</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
        {headerMode === 'executing' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => controller.driveImport.cancel()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonLabel}>Cancel import</Text>
          </Pressable>
        ) : null}
        {headerMode === 'completed' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => exitReview(controller.search.selection.cancel)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonLabel}>Dismiss</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  destinationHeader: {
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.border,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: appTheme.colors.listMarker,
  },
  primaryButtonLabel: {
    color: '#fff8ef',
    fontSize: 14,
    fontWeight: '700',
  },
  screen: {
    flex: 1,
    backgroundColor: appTheme.colors.pageBackground,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  secondaryButtonLabel: {
    color: appTheme.colors.listMarker,
    fontSize: 14,
    fontWeight: '700',
  },
});
