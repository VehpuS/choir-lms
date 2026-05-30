import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  body,
  canRefresh,
  eyebrow = 'Drive',
  isLoading,
  onRefresh,
  title = 'Browse Drive',
}: DriveLibrarySectionHeaderProps) => {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
        {body ? <Text style={styles.sectionBody}>{body}</Text> : null}
      </View>
      {canRefresh ? (
        <Pressable
          accessibilityLabel={isLoading ? 'Refreshing Drive' : 'Refresh Drive'}
          accessibilityRole="button"
          disabled={isLoading}
          onPress={onRefresh}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed ? styles.refreshButtonPressed : undefined,
            isLoading ? styles.refreshButtonDisabled : undefined,
          ]}
        >
          <MaterialCommunityIcons
            color={PRIMARY_ACTION_TEXT}
            name={isLoading ? 'progress-clock' : 'refresh'}
            size={18}
          />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionCopy: {
    flex: 1,
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
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: PRIMARY_ACTION_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonPressed: {
    opacity: 0.88,
  },
  refreshButtonDisabled: {
    opacity: 0.56,
  },
});
