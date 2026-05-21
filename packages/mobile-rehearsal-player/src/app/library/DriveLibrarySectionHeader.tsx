import { Pressable, StyleSheet, Text, View } from 'react-native';

type DriveLibrarySectionHeaderProps = {
  body?: string;
  canRefresh: boolean;
  eyebrow?: string;
  isLoading: boolean;
  onRefresh: () => void;
  title?: string;
};

const PRIMARY_ACTION_BACKGROUND = '#173229';
const PRIMARY_ACTION_TEXT = '#fff8ef';
const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_TEXT = '#5f5647';

export const DriveLibrarySectionHeader = ({
  body = 'Find supported tracks across My Drive and shared folders, inspect unavailable or unsupported items, and prepare the sources that will later be saved into the app-owned rehearsal library.',
  canRefresh,
  eyebrow = 'Drive discovery',
  isLoading,
  onRefresh,
  title = 'Browse folders and search for practice tracks',
}: DriveLibrarySectionHeaderProps) => {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionBody}>{body}</Text>
      </View>
      {canRefresh ? (
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={onRefresh}
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
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: PRIMARY_ACTION_BACKGROUND,
  },
  refreshButtonPressed: {
    opacity: 0.88,
  },
  refreshButtonDisabled: {
    opacity: 0.56,
  },
  refreshButtonLabel: {
    color: PRIMARY_ACTION_TEXT,
    fontSize: 14,
    fontWeight: '600',
  },
});
