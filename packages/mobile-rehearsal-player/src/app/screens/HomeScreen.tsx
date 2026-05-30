import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { PlayableItem } from '@org/audio-library-models';
import { join, map, toUpper } from 'es-toolkit/compat';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { runtimeConfig } from '../../config/runtime';
import { appTheme } from '../utils/theme';
import {
  getHomeContinuePracticingCopy,
  getRecentsShortcutPlayActionCopy,
} from './screen-copy';

export type HomeScreenProps = {
  activePlayableItem: PlayableItem | null;
  onPlayRecentShortcut: (shortcutTag: string) => void;
  onResumeRecentPlayback: () => void;
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
  onPlayRecentShortcut,
  onResumeRecentPlayback,
  savedTrackCount,
}: HomeScreenProps) => {
  const continuePracticingCopy = getHomeContinuePracticingCopy({
    activePlayableItemTitle: activePlayableItem?.title ?? null,
    savedTrackCount,
  });
  const isRecentPlaybackAvailable = activePlayableItem !== null;

  const shortcutMetadata = `${RECENTS_SHORTCUT_TAGS.length} optional shortcut tags`;

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

      <View style={styles.resumeCard}>
        <Text style={styles.resumeCardEyebrow}>Recents</Text>
        <Text style={styles.resumeCardTitle}>
          {continuePracticingCopy.title}
        </Text>
        <Text style={styles.resumeCardBody}>{continuePracticingCopy.body}</Text>
        {activePlayableItem ? (
          <View style={styles.recentItemRow}>
            <Text numberOfLines={1} style={styles.recentItemTitle}>
              {activePlayableItem.title}
            </Text>
            <Pressable
              accessibilityLabel={`Play ${activePlayableItem.title}`}
              accessibilityRole="button"
              onPress={onResumeRecentPlayback}
              style={({ pressed }) => [
                styles.iconActionButton,
                pressed ? styles.iconActionButtonPressed : undefined,
              ]}
            >
              <MaterialCommunityIcons
                color={appTheme.colors.primaryText}
                name="play"
                size={22}
              />
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.shortcutsCard}>
        <View style={styles.shortcutsHeader}>
          <View style={styles.shortcutsCopy}>
            <Text style={styles.shortcutsTitle}>Popular shortcuts</Text>
            <Text style={styles.shortcutsBody}>
              Optional tag shortcuts for fast recents scanning.
            </Text>
          </View>
        </View>
        <Text style={styles.shortcutsMeta}>{shortcutMetadata}</Text>
        <View style={styles.tagRow}>
          {RECENTS_SHORTCUT_TAGS.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagLabel}>{tag}</Text>
              <Pressable
                accessibilityLabel={
                  getRecentsShortcutPlayActionCopy({
                    isResumePlaybackAvailable: isRecentPlaybackAvailable,
                    shortcutTag: tag,
                  }).accessibilityLabel
                }
                accessibilityRole="button"
                disabled={!isRecentPlaybackAvailable}
                onPress={() => {
                  onPlayRecentShortcut(tag);
                }}
                style={({ pressed }) => [
                  styles.tagPlayButton,
                  pressed && isRecentPlaybackAvailable
                    ? styles.iconActionButtonPressed
                    : undefined,
                  !isRecentPlaybackAvailable
                    ? styles.iconActionButtonDisabled
                    : undefined,
                ]}
              >
                <MaterialCommunityIcons
                  color={
                    !isRecentPlaybackAvailable
                      ? appTheme.colors.secondaryText
                      : appTheme.colors.primaryText
                  }
                  name="play"
                  size={16}
                />
              </Pressable>
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
  resumeCard: {
    gap: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 14,
    backgroundColor: appTheme.colors.cardBackground,
  },
  resumeCardEyebrow: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  resumeCardTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  resumeCardBody: {
    color: appTheme.colors.secondaryText,
    fontSize: 15,
    lineHeight: 22,
  },
  shortcutsHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  recentItemRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recentItemTitle: {
    flex: 1,
    color: appTheme.colors.primaryText,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  shortcutsCopy: {
    flex: 1,
    gap: 4,
  },
  iconActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surfaceBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionButtonPressed: {
    opacity: 0.85,
  },
  iconActionButtonDisabled: {
    opacity: 0.55,
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
  shortcutsMeta: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd5c6',
    backgroundColor: '#f5f1e8',
  },
  tagPlayButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 12,
    fontWeight: '600',
  },
});
