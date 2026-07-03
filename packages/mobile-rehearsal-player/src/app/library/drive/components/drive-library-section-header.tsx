import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { SectionHeading } from '../../components/section-heading';

type DriveLibrarySectionHeaderProps = {
  body?: string;
  canRefresh: boolean;
  eyebrow?: string;
  isLoading: boolean;
  onRefresh: () => void;
  title?: string;
  trailingAction?: ReactNode;
};

const PRIMARY_ACTION_BACKGROUND = '#173229';
const PRIMARY_ACTION_TEXT = '#fff8ef';
const PRIMARY_TEXT = '#1f1c17';

export const DriveLibrarySectionHeader = ({
  body,
  canRefresh,
  eyebrow,
  isLoading,
  onRefresh,
  title = 'Browse Drive',
  trailingAction,
}: DriveLibrarySectionHeaderProps) => {
  const refreshButton = canRefresh ? (
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
  ) : null;
  const resolvedTrailingAction = trailingAction ?? refreshButton;

  return (
    <SectionHeading
      body={body}
      eyebrow={eyebrow}
      style={styles.sectionHeader}
      title={title}
      titleStyle={styles.sectionTitle}
      trailingAction={resolvedTrailingAction}
    />
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    gap: 8,
  },
  sectionTitle: {
    color: PRIMARY_TEXT,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  refreshButton: {
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
