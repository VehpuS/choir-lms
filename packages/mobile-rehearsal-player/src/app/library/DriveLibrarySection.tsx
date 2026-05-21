import type { DriveAuthorizationState } from '@org/google-drive';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  getDriveLibraryStatusCopy,
  type DriveLibraryStatusTone,
} from './drive-library-view-model';
import { DriveFolderGroup } from './DriveFolderGroup';
import { DriveLibrarySourceGroup } from './DriveLibrarySourceGroup';
import { useDriveLibrary } from './use-drive-library';

type DriveLibrarySectionProps = {
  authState: DriveAuthorizationState;
  googleAuthConfigured: boolean;
};

const BORDER_COLOR = '#d6d1c4';
const CARD_BACKGROUND = '#fffdf8';
const ERROR_SURFACE = '#fff1ed';
const ERROR_TEXT = '#8a2d1f';
const NEUTRAL_SURFACE = '#f6f1e7';
const PRIMARY_TEXT = '#1f1c17';
const READY_SURFACE = '#e7f2ec';
const READY_TEXT = '#1f5c40';
const SECONDARY_TEXT = '#5f5647';
const WARNING_SURFACE = '#fff4dd';
const WARNING_TEXT = '#7f5b12';

const ROOT_OPTIONS = [
  {
    label: 'My Drive',
    rootKind: 'my-drive',
  },
  {
    label: 'Shared folders',
    rootKind: 'shared',
  },
] as const;

const getToneSurfaceStyle = (tone: DriveLibraryStatusTone) => {
  if (tone === 'ready') {
    return styles.statusReady;
  }

  if (tone === 'warning') {
    return styles.statusWarning;
  }

  if (tone === 'error') {
    return styles.statusError;
  }

  return styles.statusNeutral;
};

const getToneTitleStyle = (tone: DriveLibraryStatusTone) => {
  if (tone === 'ready') {
    return styles.statusReadyText;
  }

  if (tone === 'warning') {
    return styles.statusWarningText;
  }

  if (tone === 'error') {
    return styles.statusErrorText;
  }

  return styles.statusNeutralText;
};

export const DriveLibrarySection = ({
  authState,
  googleAuthConfigured,
}: DriveLibrarySectionProps) => {
  const {
    activeSearchQuery,
    browseSnapshot,
    clearSearch,
    currentLocation,
    goToLocation,
    isLoading,
    issue,
    navigationStack,
    openFolder,
    playableSources,
    refresh,
    searchQuery,
    searchSnapshot,
    selectRoot,
    setSearchQuery,
    submitSearch,
    unavailableSources,
  } = useDriveLibrary(authState);
  const statusCopy = getDriveLibraryStatusCopy({
    authState,
    activeSearchQuery,
    browseSnapshot,
    googleAuthConfigured,
    isLoading,
    issue,
    searchSnapshot,
  });
  const canRefresh = authState.status === 'authorized';
  const isSearchMode = activeSearchQuery !== null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Text style={styles.eyebrow}>Drive discovery</Text>
          <Text style={styles.sectionTitle}>
            Browse folders and search for practice tracks
          </Text>
          <Text style={styles.sectionBody}>
            Find supported tracks across My Drive and shared folders, inspect
            unavailable or unsupported items, and prepare the sources that will
            later be saved into the app-owned rehearsal library.
          </Text>
        </View>
        {canRefresh ? (
          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={refresh}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed ? styles.refreshButtonPressed : undefined,
              isLoading ? styles.refreshButtonDisabled : undefined,
            ]}
          >
            <Text style={styles.refreshButtonLabel}>
              {isLoading ? 'Refreshing' : 'Refresh'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.searchPanel}>
        <Text style={styles.searchLabel}>Track search</Text>
        <View style={styles.searchRow}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              submitSearch();
            }}
            placeholder="Search My Drive and shared folders"
            placeholderTextColor="#857b6c"
            returnKeyType="search"
            style={styles.searchInput}
            value={searchQuery}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!canRefresh || isLoading}
            onPress={submitSearch}
            style={({ pressed }) => [
              styles.searchButton,
              pressed ? styles.searchButtonPressed : undefined,
              !canRefresh || isLoading
                ? styles.searchButtonDisabled
                : undefined,
            ]}
          >
            <Text style={styles.searchButtonLabel}>Search</Text>
          </Pressable>
        </View>
        {isSearchMode ? (
          <Pressable
            accessibilityRole="button"
            onPress={clearSearch}
            style={({ pressed }) => [
              styles.clearSearchButton,
              pressed ? styles.clearSearchButtonPressed : undefined,
            ]}
          >
            <Text style={styles.clearSearchLabel}>
              Return to folder browsing
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.rootSelector}>
        {ROOT_OPTIONS.map((option) => {
          const isSelected =
            !isSearchMode && currentLocation.rootKind === option.rootKind;

          return (
            <Pressable
              key={option.rootKind}
              accessibilityRole="button"
              onPress={() => {
                selectRoot(option.rootKind);
              }}
              style={({ pressed }) => [
                styles.rootSelectorButton,
                isSelected ? styles.rootSelectorButtonSelected : undefined,
                pressed ? styles.rootSelectorButtonPressed : undefined,
              ]}
            >
              <Text
                style={[
                  styles.rootSelectorLabel,
                  isSelected ? styles.rootSelectorLabelSelected : undefined,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!isSearchMode ? (
        <View style={styles.breadcrumbRow}>
          {navigationStack.map((location, index) => {
            const isCurrentLocation = index === navigationStack.length - 1;

            return (
              <View
                key={`${location.kind}:${location.id}`}
                style={styles.breadcrumbItem}
              >
                {index > 0 ? (
                  <Text style={styles.breadcrumbSeparator}>/</Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={isCurrentLocation}
                  onPress={() => {
                    goToLocation(index);
                  }}
                  style={({ pressed }) => [
                    styles.breadcrumbButton,
                    pressed && !isCurrentLocation
                      ? styles.breadcrumbButtonPressed
                      : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.breadcrumbLabel,
                      isCurrentLocation
                        ? styles.breadcrumbLabelCurrent
                        : undefined,
                    ]}
                  >
                    {location.name}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={[styles.statusCard, getToneSurfaceStyle(statusCopy.tone)]}>
        <Text style={[styles.statusTitle, getToneTitleStyle(statusCopy.tone)]}>
          {statusCopy.title}
        </Text>
        <Text style={styles.statusMessage}>{statusCopy.message}</Text>
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={SECONDARY_TEXT} size="small" />
            <Text style={styles.loadingLabel}>Refreshing Google Drive…</Text>
          </View>
        ) : null}
      </View>

      {!isSearchMode ? (
        <DriveFolderGroup
          folders={browseSnapshot.folders}
          onOpenFolder={openFolder}
          title={
            currentLocation.rootKind === 'shared' &&
            currentLocation.kind === 'root'
              ? `Shared folders (${browseSnapshot.folders.length})`
              : `Folders (${browseSnapshot.folders.length})`
          }
        />
      ) : null}

      <DriveLibrarySourceGroup
        sources={playableSources}
        title={
          isSearchMode
            ? `Matching audio (${playableSources.length})`
            : `Audio in ${currentLocation.name} (${playableSources.length})`
        }
      />

      <DriveLibrarySourceGroup
        sources={unavailableSources}
        title={
          isSearchMode
            ? `Unavailable or unsupported results (${unavailableSources.length})`
            : `Unavailable or unsupported in ${currentLocation.name} (${unavailableSources.length})`
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 20,
    backgroundColor: CARD_BACKGROUND,
  },
  sectionHeader: {
    gap: 16,
  },
  sectionCopy: {
    gap: 8,
  },
  eyebrow: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: PRIMARY_TEXT,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  sectionBody: {
    color: SECONDARY_TEXT,
    fontSize: 15,
    lineHeight: 22,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#173229',
  },
  refreshButtonPressed: {
    opacity: 0.88,
  },
  refreshButtonDisabled: {
    opacity: 0.56,
  },
  refreshButtonLabel: {
    color: '#fff8ef',
    fontSize: 14,
    fontWeight: '600',
  },
  searchPanel: {
    gap: 12,
  },
  searchLabel: {
    color: PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  searchRow: {
    gap: 12,
  },
  searchInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    backgroundColor: '#fff9f0',
    color: PRIMARY_TEXT,
    fontSize: 15,
  },
  searchButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#305c4d',
  },
  searchButtonPressed: {
    opacity: 0.88,
  },
  searchButtonDisabled: {
    opacity: 0.56,
  },
  searchButtonLabel: {
    color: '#fff8ef',
    fontSize: 14,
    fontWeight: '600',
  },
  clearSearchButton: {
    alignSelf: 'flex-start',
  },
  clearSearchButtonPressed: {
    opacity: 0.75,
  },
  clearSearchLabel: {
    color: '#305c4d',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rootSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rootSelectorButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: NEUTRAL_SURFACE,
  },
  rootSelectorButtonSelected: {
    backgroundColor: '#173229',
  },
  rootSelectorButtonPressed: {
    opacity: 0.88,
  },
  rootSelectorLabel: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rootSelectorLabelSelected: {
    color: '#fff8ef',
  },
  breadcrumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  breadcrumbSeparator: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    fontWeight: '600',
  },
  breadcrumbButton: {
    paddingVertical: 2,
  },
  breadcrumbButtonPressed: {
    opacity: 0.75,
  },
  breadcrumbLabel: {
    color: '#305c4d',
    fontSize: 13,
    fontWeight: '700',
  },
  breadcrumbLabelCurrent: {
    color: PRIMARY_TEXT,
  },
  statusCard: {
    gap: 8,
    padding: 16,
    borderRadius: 16,
  },
  statusNeutral: {
    backgroundColor: NEUTRAL_SURFACE,
  },
  statusReady: {
    backgroundColor: READY_SURFACE,
  },
  statusWarning: {
    backgroundColor: WARNING_SURFACE,
  },
  statusError: {
    backgroundColor: ERROR_SURFACE,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusNeutralText: {
    color: PRIMARY_TEXT,
  },
  statusReadyText: {
    color: READY_TEXT,
  },
  statusWarningText: {
    color: WARNING_TEXT,
  },
  statusErrorText: {
    color: ERROR_TEXT,
  },
  statusMessage: {
    color: SECONDARY_TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  loadingLabel: {
    color: SECONDARY_TEXT,
    fontSize: 14,
  },
});
