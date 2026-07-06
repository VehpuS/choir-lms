import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DriveSessionMenu } from '../../auth/google-drive/components/drive-session-menu';
import type { DriveSessionMenuController } from '../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import { DestinationHeader } from '../../components/destination-header';
import { getDestinationHeaderModel } from '../../components/destination-header-model';
import { resolveHeaderSearchToggleOutcome } from '../../components/header-search-toggle-model';
import { DriveDiscoveryPanel } from '../../library/drive/components/drive-discovery-panel';
import { ADD_SCREEN_DRIVE_PANEL_ORDER } from '../../library/drive/utils/drive-discovery-layout';
import type { useRehearsalLibraryController } from '../../library/saved-rehearsal-library/use-rehearsal-library-controller';
import { appTheme } from '../../utils/theme';

type AddScreenProps = {
  authorization: DriveSessionMenuController;
  libraryController: ReturnType<typeof useRehearsalLibraryController>;
};

type DriveDiscoveryActionButtonProps = {
  accessibilityLabel: string;
  iconName: 'close' | 'magnify' | 'progress-clock' | 'refresh';
  isDisabled?: boolean;
  isFilled?: boolean;
  onPress: () => void;
};

const ACTION_BUTTON_SIZE = 40;
const ACTION_ROW_GAP = 12;

const DriveDiscoveryActionButton = ({
  accessibilityLabel,
  iconName,
  isDisabled = false,
  isFilled = false,
  onPress,
}: DriveDiscoveryActionButtonProps) => {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerActionButton,
        isFilled
          ? styles.headerActionButtonFilled
          : styles.headerActionButtonOutline,
        pressed ? styles.headerActionButtonPressed : undefined,
        isDisabled ? styles.headerActionButtonDisabled : undefined,
      ]}
    >
      <MaterialCommunityIcons
        color={isFilled ? appTheme.colors.heroBackground : '#fff8ef'}
        name={iconName}
        size={18}
      />
    </Pressable>
  );
};

export const AddScreen = ({
  authorization,
  libraryController,
}: AddScreenProps) => {
  const headerModel = getDestinationHeaderModel('add');
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [isSessionMenuVisible, setIsSessionMenuVisible] = useState(false);

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
  content: {
    gap: 14,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerActionButton: {
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerActionButtonDisabled: {
    opacity: 0.56,
  },
  headerActionButtonFilled: {
    borderColor: '#fff8ef',
    backgroundColor: '#fff8ef',
  },
  headerActionButtonOutline: {
    borderColor: 'rgba(255, 248, 239, 0.26)',
    backgroundColor: 'rgba(255, 248, 239, 0.08)',
  },
  headerActionButtonPressed: {
    opacity: 0.88,
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
