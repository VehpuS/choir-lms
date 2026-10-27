import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import { SegmentedControl } from '../../components/segmented-control';
import type { OfflineStorageSummary } from '../../library/offline/offline-storage-model';
import { audioCacheBudgetStore } from '../../library/playback/audio-cache/audio-cache-budget';
import { appTheme } from '../../utils/theme';
import {
  getAutomaticUsageLabel,
  getKeptUsageLabel,
} from '../offline-files/model';
import { offlineFilesNavigationStore } from '../offline-files/offline-files-navigation-store';
import { useOfflineStorage } from '../offline-files/use-offline-storage';
import { OFFLINE_STORAGE_COPY, OFFLINE_CACHE_SIZE_OPTIONS } from './model';
import { settingsNavigationStore } from './settings-navigation-store';

/** The cache size, what is stored, and the way into the offline files view. */
export const OfflineStorageSection = () => {
  const { snapshot } = useOfflineStorage('recent');

  return (
    <OfflineStorageSectionView
      onOpenFiles={() => {
        // Offline files shows over the destinations, so Settings steps aside.
        settingsNavigationStore.close();
        offlineFilesNavigationStore.open();
      }}
      onSelectCacheSize={(bytes) => {
        // The hook subscribes to the size, so the control follows it.
        void audioCacheBudgetStore.set(bytes);
      }}
      summary={snapshot.summary}
    />
  );
};

type OfflineStorageSectionViewProps = {
  onOpenFiles: () => void;
  onSelectCacheSize: (bytes: number) => void;
  summary: OfflineStorageSummary;
};

/** The page itself, given its data, so it renders without browser storage. */
export const OfflineStorageSectionView = ({
  onOpenFiles,
  onSelectCacheSize,
  summary,
}: OfflineStorageSectionViewProps) => {
  return (
    <View style={styles.section}>
      <Text style={styles.body}>{OFFLINE_STORAGE_COPY.body}</Text>
      <View style={styles.row}>
        <Text style={styles.rowTitle}>
          {OFFLINE_STORAGE_COPY.cacheSizeTitle}
        </Text>
        <Text style={styles.body}>{OFFLINE_STORAGE_COPY.cacheSizeBody}</Text>
        <SegmentedControl
          accessibilityLabel={OFFLINE_STORAGE_COPY.cacheSizeTitle}
          onSelect={(value) => {
            onSelectCacheSize(Number(value));
          }}
          options={OFFLINE_CACHE_SIZE_OPTIONS}
          selectedValue={String(summary.budgetBytes)}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowTitle}>{OFFLINE_STORAGE_COPY.usedTitle}</Text>
        <Text style={styles.body}>
          {`Automatic cache: ${getAutomaticUsageLabel(summary)}`}
        </Text>
        <Text style={styles.body}>{getKeptUsageLabel(summary)}</Text>
      </View>
      <OutlinedActionButton
        label={OFFLINE_STORAGE_COPY.openFilesLabel}
        onPress={onOpenFiles}
        variant="neutral"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  row: { gap: appTheme.space.xs },
  rowTitle: {
    color: appTheme.colors.text,
    fontSize: 15,
    fontWeight: appTheme.fontWeight.medium,
  },
  section: { gap: appTheme.space.lg },
});
