import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { DriveSessionMenu } from '../../auth/google-drive/components/drive-session-menu';
import type { DriveSessionMenuController } from '../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import { useScopedSuccessAcknowledgment } from '../../components/scoped-success-acknowledgment/use-scoped-success-acknowledgment';
import { DestinationHeader } from '../../components/destination-header';
import { getDestinationHeaderModel } from '../../components/destination-header-model';
import { resolveHeaderSearchToggleOutcome } from '../../components/header-search-toggle-model';
import { DriveDiscoveryPanel } from '../../library/drive/components/drive-discovery-panel';
import { ADD_SCREEN_DRIVE_PANEL_ORDER } from '../../library/drive/utils/drive-discovery-layout';
import type { useRehearsalLibraryController } from '../../library/saved-rehearsal-library/use-rehearsal-library-controller';
import { appTheme } from '../../utils/theme';
import {
  ACTION_BUTTON_SIZE,
  DriveDiscoveryActionButton,
} from './drive-discovery-action-button';
import { DriveTrackSavedFeedbackCard } from './drive-track-saved-feedback-card';
import {
  createDriveTrackSavedFeedback,
  resolveTrackSaveDetection,
} from './drive-track-saved-feedback';

const TRACK_SAVED_AUTO_DISMISS_MS = 5000;
const ACTION_ROW_GAP = 12;

type AddScreenProps = {
  authorization: DriveSessionMenuController;
  isActive: boolean;
  libraryController: ReturnType<typeof useRehearsalLibraryController>;
};

export const AddScreen = ({
  authorization,
  isActive,
  libraryController,
}: AddScreenProps) => {
  const headerModel = getDestinationHeaderModel('add');
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [isSessionMenuVisible, setIsSessionMenuVisible] = useState(false);
  const trackSavedFeedback = useScopedSuccessAcknowledgment<
    ReturnType<typeof createDriveTrackSavedFeedback>
  >({
    autoDismissMs: TRACK_SAVED_AUTO_DISMISS_MS,
    isActive,
    isScreenReaderEnabled: () => AccessibilityInfo.isScreenReaderEnabled(),
  });
  const savedSourceIdsRef = useRef<Set<string> | null>(null);
  const savedLibrarySources =
    libraryController.savedLibrary.savedLibrarySources;
  const isSavedLibraryLoading = libraryController.savedLibrary.isLoading;

  useEffect(() => {
    const detection = resolveTrackSaveDetection({
      currentSources: savedLibrarySources,
      isLoading: isSavedLibraryLoading,
      previouslySavedIds: savedSourceIdsRef.current,
    });

    savedSourceIdsRef.current = detection.nextBaselineIds;

    const newlySavedSource = detection.newlySavedSource;

    if (!newlySavedSource) {
      return;
    }

    trackSavedFeedback.show(
      createDriveTrackSavedFeedback({
        trackId: newlySavedSource.id,
        trackName: newlySavedSource.name,
      }),
    );
    // Only isSavedLibraryLoading/savedLibrarySources should trigger this
    // effect; trackSavedFeedback is a fresh object every render, but the
    // effect that actually runs (when one of those changes) always closes
    // over that render's own `show`, so omitting it doesn't risk staleness.
  }, [isSavedLibraryLoading, savedLibrarySources]);

  const handleToggleSearchBar = () => {
    const toggleOutcome = resolveHeaderSearchToggleOutcome({
      isSearchBarVisible,
      searchQuery: libraryController.search.searchQuery,
    });

    setIsSessionMenuVisible(false);

    if (toggleOutcome.shouldDeactivateSearch) {
      libraryController.search.deactivateSearch();
    }

    setIsSearchBarVisible(toggleOutcome.nextIsSearchBarVisible);

    if (toggleOutcome.shouldSubmitSearch) {
      libraryController.search.submitSearch();
    }
  };

  const renderedPanels = ADD_SCREEN_DRIVE_PANEL_ORDER.map((panelKey) => {
    return (
      <DriveDiscoveryPanel
        controller={libraryController}
        isSearchBarVisible={isSearchBarVisible}
        key={panelKey}
        onToggleSearchBar={handleToggleSearchBar}
      />
    );
  });

  return (
    <View style={styles.screen}>
      {isSessionMenuVisible ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setIsSessionMenuVisible(false);
          }}
          style={styles.menuBackdrop}
        />
      ) : null}
      <DestinationHeader
        style={styles.destinationHeader}
        title={headerModel.title}
        trailingAction={
          <View style={styles.headerActionRow}>
            {isSearchBarVisible || !libraryController.discovery.canRefresh ? (
              <View style={styles.headerActionSpacer} />
            ) : (
              <DriveDiscoveryActionButton
                accessibilityLabel={
                  libraryController.discovery.isLoading
                    ? 'Refreshing Drive'
                    : 'Refresh Drive'
                }
                iconName={
                  libraryController.discovery.isLoading
                    ? 'progress-clock'
                    : 'refresh'
                }
                isDisabled={libraryController.discovery.isLoading}
                onPress={() => {
                  setIsSessionMenuVisible(false);
                  libraryController.discovery.refresh();
                }}
              />
            )}
            <DriveDiscoveryActionButton
              accessibilityLabel={
                isSearchBarVisible ? 'Close search' : 'Search Google Drive'
              }
              iconName={isSearchBarVisible ? 'close' : 'magnify'}
              isFilled={true}
              onPress={handleToggleSearchBar}
            />
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
          </View>
        }
      />
      {trackSavedFeedback.acknowledgment ? (
        <View style={styles.trackSavedFeedback}>
          <DriveTrackSavedFeedbackCard
            feedback={trackSavedFeedback.acknowledgment}
            onBlur={trackSavedFeedback.onBlur}
            onDismiss={trackSavedFeedback.dismiss}
            onFocus={trackSavedFeedback.onFocus}
          />
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {renderedPanels}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appTheme.colors.pageBackground,
  },
  destinationHeader: {
    marginTop: 12,
  },
  trackSavedFeedback: {
    marginTop: 12,
  },
  content: {
    gap: 14,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ACTION_ROW_GAP,
  },
  headerActionSpacer: {
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
    backgroundColor: appTheme.colors.pageBackground,
  },
});
