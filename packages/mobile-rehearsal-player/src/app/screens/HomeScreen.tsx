import type { PlayableItem } from '@org/audio-library-models';
import { join, map, toUpper } from 'es-toolkit/compat';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { runtimeConfig } from '../../config/runtime';
import { SummaryCard } from '../components/SummaryCard';
import { appTheme } from '../utils/theme';
import { getHomeContinuePracticingCopy } from './screen-copy';

export type HomeScreenProps = {
  activePlayableItem: PlayableItem | null;
  savedTrackCount: number;
};

const RECENTS_SHORTCUT_TAGS = ['Soprano', 'Alto', 'Tenor', 'Bass', 'Warmup'];

const AUDIO_FORMAT_LABEL = join(
  map(runtimeConfig.supportedAudioExtensions, (extension) =>
    toUpper(extension),
  ),
  ', ',
);

export const HomeScreen = ({
  activePlayableItem,
  savedTrackCount,
}: HomeScreenProps) => {
  const continuePracticingCopy = activePlayableItem
    ? getHomeContinuePracticingCopy({
        activePlayableItemTitle: activePlayableItem.title,
        savedTrackCount,
      })
    : null;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={styles.hero}>
        <Text style={styles.kicker}>Recents</Text>
        <Text style={styles.title}>Resume your latest practice</Text>
        <Text style={styles.subtitle}>Jump back into practice here.</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Saved tracks</Text>
          <Text style={styles.statusValue}>{savedTrackCount}</Text>
        </View>
        <Text style={styles.statusValueList}>{AUDIO_FORMAT_LABEL}</Text>
      </View>

      {continuePracticingCopy ? (
        <SummaryCard
          body={continuePracticingCopy.body}
          eyebrow="Recents"
          title={continuePracticingCopy.title}
        />
      ) : null}

      <View style={styles.shortcutsCard}>
        <Text style={styles.shortcutsTitle}>Popular shortcuts</Text>
        <Text style={styles.shortcutsBody}>
          Optional tag shortcuts for fast recents scanning.
        </Text>
        <View style={styles.tagRow}>
          {RECENTS_SHORTCUT_TAGS.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagLabel}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
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
    gap: 10,
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
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  subtitle: {
    color: appTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 20,
    fontWeight: '700',
  },
  statusValueList: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  shortcutsCard: {
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 14,
    backgroundColor: appTheme.colors.surfaceBackground,
  },
  shortcutsTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 16,
    fontWeight: '700',
  },
  shortcutsBody: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd5c6',
    backgroundColor: '#f5f1e8',
  },
  tagLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 12,
    fontWeight: '600',
  },
});
