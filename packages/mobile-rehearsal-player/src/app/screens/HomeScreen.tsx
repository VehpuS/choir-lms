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
        <View style={styles.statusRow}>
          <View style={styles.statusPill}>
            <Text style={styles.statusLabel}>Saved tracks</Text>
            <Text style={styles.statusValue}>{savedTrackCount}</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusLabel}>Audio support</Text>
            <Text style={styles.statusValue}>{AUDIO_FORMAT_LABEL}</Text>
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
    padding: 24,
    gap: 16,
  },
  hero: {
    gap: 12,
    padding: 24,
    borderRadius: 24,
    backgroundColor: appTheme.colors.heroBackground,
  },
  kicker: {
    color: '#d1e8dd',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff8ef',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  subtitle: {
    color: '#dce7e1',
    fontSize: 16,
    lineHeight: 24,
  },
  statusRow: {
    gap: 12,
  },
  statusPill: {
    gap: 4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 248, 239, 0.12)',
  },
  statusLabel: {
    color: '#dce7e1',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusValue: {
    color: '#fff8ef',
    fontSize: 16,
    fontWeight: '600',
  },
});
