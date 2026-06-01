import { MaterialCommunityIcons } from '@expo/vector-icons';
import { join, map, toUpper } from 'es-toolkit/compat';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { runtimeConfig } from '../../config/runtime';
import { appTheme } from '../utils/theme';
import {
  getRecentRehearsalLastPlayedLabel,
  type RecentRehearsalItem,
} from './recents-history';
import {
  getRecentsContinuePracticingCopy,
  getRecentsShortcutPlayActionCopy,
} from './screen-copy';

export type RecentsScreenProps = {
  activePlayableItemId: string | null;
  isPlaybackActive: boolean;
  recentRehearsalHistory: RecentRehearsalItem[];
  onPlayRecentShortcut: (shortcutTag: string) => void;
  onResumeRecentPlayback: (recentRehearsal: RecentRehearsalItem) => void;
  savedTrackCount: number;
};

const RECENTS_SHORTCUT_TAGS = ['Soprano', 'Alto', 'Tenor', 'Bass', 'Warmup'];

const AUDIO_FORMAT_LABEL = join(
  map(runtimeConfig.supportedAudioExtensions, (extension) =>
    toUpper(extension),
  ),
  ', ',
);

export const RecentsScreen = ({
  activePlayableItemId,
  isPlaybackActive,
  recentRehearsalHistory,
  onPlayRecentShortcut,
  onResumeRecentPlayback,
  savedTrackCount,
}: RecentsScreenProps) => {
  const latestRecentRehearsal = recentRehearsalHistory[0] ?? null;
  const continuePracticingCopy = getRecentsContinuePracticingCopy({
    activePlayableItemTitle: latestRecentRehearsal?.title ?? null,
    savedTrackCount,
  });
  const isRecentPlaybackAvailable = latestRecentRehearsal !== null;

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
        {recentRehearsalHistory.map((recentRehearsal) => {
          const isCurrentRowPlaying =
            isPlaybackActive &&
            recentRehearsal.playableItem.id === activePlayableItemId;

          return (
            <View key={recentRehearsal.id} style={styles.recentItemRow}>
              <View style={styles.recentItemCopy}>
                <Text numberOfLines={1} style={styles.recentItemTitle}>
                  {recentRehearsal.title}
                </Text>
                <Text numberOfLines={1} style={styles.recentItemMeta}>
                  {getRecentRehearsalLastPlayedLabel(recentRehearsal.playedAt)}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={`Play ${recentRehearsal.title}`}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: isCurrentRowPlaying,
                }}
                disabled={isCurrentRowPlaying}
                onPress={() => {
                  onResumeRecentPlayback(recentRehearsal);
                }}
                style={({ pressed }) => [
                  styles.iconActionButton,
                  pressed && !isCurrentRowPlaying
                    ? styles.iconActionButtonPressed
                    : undefined,
                  isCurrentRowPlaying
                    ? styles.iconActionButtonDisabled
                    : undefined,
                ]}
              >
                <MaterialCommunityIcons
                  color={
                    isCurrentRowPlaying
                      ? appTheme.colors.secondaryText
                      : appTheme.colors.primaryText
                  }
                  name="play"
                  size={22}
                />
              </Pressable>
            </View>
          );
        })}
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
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  resumeCardTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 19,
    fontWeight: '700',
  },
  resumeCardBody: {
    color: appTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  recentItemRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recentItemTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '600',
  },
  recentItemCopy: {
    flex: 1,
    gap: 2,
  },
  recentItemMeta: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    lineHeight: 16,
  },
  shortcutsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  shortcutsCopy: {
    flex: 1,
    gap: 4,
  },
  shortcutsTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 17,
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
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.pageBackground,
  },
  tagLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 13,
    fontWeight: '600',
  },
  tagPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.colors.surfaceBackground,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  iconActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.colors.surfaceBackground,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  iconActionButtonPressed: {
    opacity: 0.75,
  },
  iconActionButtonDisabled: {
    opacity: 0.45,
  },
});
