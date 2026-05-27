import type { PlayableItem } from '@org/audio-library-models';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { join, map, toUpper } from 'es-toolkit/compat';

import { runtimeConfig } from '../../config/runtime';
import { SummaryCard } from '../components/SummaryCard';
import { DriveDiscoveryPanel } from '../library/components/DriveDiscoveryPanel';
import type { useRehearsalLibraryScreenController } from '../library/hooks/use-rehearsal-library-screen-controller';
import { appTheme } from '../utils/theme';
import { getHomeContinuePracticingCopy } from './screen-copy';

export type HomeScreenProps = {
  activePlayableItem: PlayableItem | null;
  libraryController: ReturnType<typeof useRehearsalLibraryScreenController>;
  savedTrackCount: number;
};

const AUDIO_FORMAT_LABEL = join(
  map(runtimeConfig.supportedAudioExtensions, (extension) =>
    toUpper(extension),
  ),
  ', ',
);

export const HomeScreen = ({
  activePlayableItem,
  libraryController,
  savedTrackCount,
}: HomeScreenProps) => {
  const continuePracticingCopy = getHomeContinuePracticingCopy({
    activePlayableItemTitle: activePlayableItem?.title ?? null,
    savedTrackCount,
  });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={styles.hero}>
        <Text style={styles.kicker}>Choir LMS</Text>
        <Text style={styles.title}>Mobile rehearsal player foundation</Text>
        <Text style={styles.subtitle}>
          A focused practice surface for choir members to find rehearsal audio,
          save repeatable loops, and build session playlists.
        </Text>
        <View style={styles.statusGroup}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Saved tracks</Text>
            <Text style={styles.statusValue}>{savedTrackCount}</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusBlock}>
            <Text style={styles.statusLabel}>Audio support</Text>
            <Text style={styles.statusValueList}>{AUDIO_FORMAT_LABEL}</Text>
          </View>
        </View>
      </View>

      <SummaryCard
        body={continuePracticingCopy.body}
        eyebrow="Home"
        title={continuePracticingCopy.title}
      />

      <SummaryCard
        body={`Scheme ${runtimeConfig.scheme} keeps Drive session controls in the shared header while discovery stays in Home, result scanning stays in Search, and saved practice material stays in Library across the iOS bundle ${runtimeConfig.iosBundleIdentifier} and Android package ${runtimeConfig.androidPackage}.`}
        eyebrow="Navigation"
        title="Session controls now follow every destination"
      />

      <DriveDiscoveryPanel controller={libraryController} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appTheme.colors.pageBackground,
  },
  content: {
    gap: 12,
    paddingTop: 10,
    paddingBottom: 18,
  },
  hero: {
    gap: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 16,
    backgroundColor: appTheme.colors.surfaceBackground,
  },
  kicker: {
    color: appTheme.colors.heroBackground,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: appTheme.colors.primaryText,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  },
  subtitle: {
    color: appTheme.colors.secondaryText,
    fontSize: 15,
    lineHeight: 22,
  },
  statusGroup: {
    borderWidth: 1,
    borderColor: '#e1dccf',
    borderRadius: 14,
    backgroundColor: '#f5f1e8',
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusDivider: {
    height: 1,
    backgroundColor: '#e1dccf',
  },
  statusBlock: {
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusLabel: {
    color: appTheme.colors.heroBackground,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusValue: {
    color: appTheme.colors.primaryText,
    fontSize: 22,
    fontWeight: '700',
  },
  statusValueList: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
});
