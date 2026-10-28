import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DestinationHeader } from '../../components/destination-header';
import { useEscapeToDismiss } from '../../components/escape-to-dismiss/use-escape-to-dismiss';
import { useFocusOnMount } from '../../components/focus-on-mount/use-focus-on-mount';
import { SurfaceIconButton } from '../../components/surface-icon-button';
import { isOfflineStorageSupported } from '../../library/offline/offline-actions';
import { pianoCapabilities } from '../../library/piano/piano-capabilities';
import { pitchCapabilities } from '../../library/pitch/pitch-capabilities';
import { scrollGutterStyles } from '../../components/scroll-gutter';
import { darkScrollbarStyle } from '../../components/dark-scrollbar';
import { appTheme } from '../../utils/theme';
import { BulkSelectionsSection } from './bulk-selections-section';
import { CategoryList } from './category-list';
import {
  SETTINGS_COPY,
  findSettingsCategory,
  visibleSettingsCategories,
} from './model';
import { MyPartsSection } from './my-parts-section';
import { OfflineStorageSection } from './offline-storage-section';
import { PianoSection } from './piano-section';
import { PitchSection } from './pitch-section';
import { SearchSourcesSection } from './search-sources-section';
import {
  settingsNavigationStore,
  useSettingsPage,
  type SettingsCategoryKey,
} from './settings-navigation-store';

const renderCategoryPage = (page: SettingsCategoryKey) => {
  switch (page) {
    case 'bulk-selections':
      return <BulkSelectionsSection />;
    case 'piano':
      return <PianoSection />;
    case 'pitch':
      return <PitchSection />;
    case 'my-parts':
      return <MyPartsSection />;
    case 'offline-storage':
      return <OfflineStorageSection />;
    case 'search-sources':
      return (
        <>
          <SearchSourcesSection kind="sheet-music" />
          <SearchSourcesSection kind="lyrics" />
        </>
      );
  }
};

// Settings is a category list; each category opens its own page so no screen
// scrolls through every option (task 1.8).
export const SettingsScreen = () => {
  const page = useSettingsPage();
  const screenRef = useRef<View>(null);
  const category = page === null ? undefined : findSettingsCategory(page);

  // An overlay needs its own way out and its own focus: Escape or the back
  // button steps from a page to the list, then closes it, and focus moves in
  // so keyboard and screen-reader users do not stay on the page underneath
  // (task 8.70).
  useEscapeToDismiss(true, settingsNavigationStore.back);
  useFocusOnMount(screenRef);

  return (
    <View
      accessibilityLabel={category?.title ?? SETTINGS_COPY.title}
      accessible={false}
      ref={screenRef}
      style={styles.screen}
      tabIndex={-1}
    >
      <DestinationHeader
        title={category?.title ?? SETTINGS_COPY.title}
        trailingAction={
          <View style={styles.actions}>
            {category ? (
              <SurfaceIconButton
                accessibilityLabel={SETTINGS_COPY.backLabel}
                icon="chevron-left"
                onPress={settingsNavigationStore.back}
              />
            ) : null}
            <SurfaceIconButton
              accessibilityLabel={SETTINGS_COPY.closeLabel}
              icon="close"
              onPress={settingsNavigationStore.close}
            />
          </View>
        }
      />
      <ScrollView
        // The forms sit low on the screen: lift them above the keyboard on iOS and
        // let the first tap reach `Add` instead of only closing the keyboard.
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.content, scrollGutterStyles.content]}
        keyboardShouldPersistTaps="handled"
        style={[darkScrollbarStyle, scrollGutterStyles.scrollView]}
      >
        {category && page ? (
          renderCategoryPage(page)
        ) : (
          <CategoryList
            categories={visibleSettingsCategories({
              canListenForPitch: pitchCapabilities().canListen,
              canPlayPiano: pianoCapabilities().canPlay,
              canStoreOffline: isOfflineStorageSupported,
            })}
            onSelect={(next) => {
              settingsNavigationStore.openPage(next.key);
            }}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  content: {
    gap: appTheme.space.lg,
    paddingBottom: appTheme.space.xl,
  },
  screen: {
    backgroundColor: appTheme.colors.bg,
    flex: 1,
    paddingHorizontal: appTheme.space.screenInset,
  },
});
