import { map } from 'es-toolkit/compat';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  getSourceAvailabilityLabel,
  getSourceMetadataLabels,
  getSourceStatusMessage,
  type DriveLibrarySource,
} from './drive-library-view-model';

type DriveLibrarySourceGroupProps = {
  getAction?: (
    source: DriveLibrarySource,
  ) => {
    disabled?: boolean;
    label: string;
    onPress: () => void;
  } | null;
  getMessage?: (source: DriveLibrarySource) => string | undefined;
  sources: DriveLibrarySource[];
  title: string;
};

const BORDER_COLOR = '#d6d1c4';
const ERROR_SURFACE = '#fff1ed';
const ERROR_TEXT = '#8a2d1f';
const PRIMARY_TEXT = '#1f1c17';
const READY_SURFACE = '#e7f2ec';
const READY_TEXT = '#1f5c40';
const SECONDARY_TEXT = '#5f5647';
const WARNING_SURFACE = '#fff4dd';
const WARNING_TEXT = '#7f5b12';

const getAvailabilityBadgeStyle = (source: DriveLibrarySource) => {
  if (source.availability.status === 'available') {
    return styles.badgeReady;
  }

  if (source.availability.status === 'unsupported') {
    return styles.badgeWarning;
  }

  return styles.badgeError;
};

const getAvailabilityLabelStyle = (source: DriveLibrarySource) => {
  if (source.availability.status === 'available') {
    return styles.badgeReadyLabel;
  }

  if (source.availability.status === 'unsupported') {
    return styles.badgeWarningLabel;
  }

  return styles.badgeErrorLabel;
};

const DriveLibrarySourceCard = ({
  getAction,
  getMessage,
  source,
}: {
  getAction?: DriveLibrarySourceGroupProps['getAction'];
  getMessage?: DriveLibrarySourceGroupProps['getMessage'];
  source: DriveLibrarySource;
}) => {
  const action = getAction?.(source) ?? null;
  const externalMessage = getMessage?.(source);
  const metadataLabel = getSourceMetadataLabels(source).join(' • ');
  const statusMessage = externalMessage ?? getSourceStatusMessage(source);
  const isErrorMessage = externalMessage !== undefined;

  return (
    <View style={styles.sourceCard}>
      <View style={styles.sourceHeader}>
        <Text style={styles.sourceName}>{source.name}</Text>
        <View style={styles.sourceControls}>
          <View style={[styles.badge, getAvailabilityBadgeStyle(source)]}>
            <Text
              style={[styles.badgeLabel, getAvailabilityLabelStyle(source)]}
            >
              {getSourceAvailabilityLabel(source)}
            </Text>
          </View>
          {action ? (
            <Pressable
              accessibilityRole="button"
              disabled={action.disabled}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && !action.disabled ? styles.actionButtonPressed : undefined,
                action.disabled ? styles.actionButtonDisabled : undefined,
              ]}
            >
              <Text style={styles.actionButtonLabel}>{action.label}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text style={styles.sourceMetadata}>{metadataLabel}</Text>
      {statusMessage ? (
        <Text
          style={isErrorMessage ? styles.sourceErrorMessage : styles.sourceMessage}
        >
          {statusMessage}
        </Text>
      ) : null}
    </View>
  );
};

export const DriveLibrarySourceGroup = ({
  getAction,
  getMessage,
  sources,
  title,
}: DriveLibrarySourceGroupProps) => {
  if (sources.length === 0) {
    return null;
  }

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupItems}>
        {map(sources, (source) => {
          return (
            <DriveLibrarySourceCard
              getAction={getAction}
              getMessage={getMessage}
              key={source.id}
              source={source}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    gap: 12,
  },
  groupTitle: {
    color: PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
  groupItems: {
    gap: 12,
  },
  sourceCard: {
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    backgroundColor: '#faf6ee',
  },
  sourceHeader: {
    gap: 12,
  },
  sourceControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  sourceName: {
    color: PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  sourceMetadata: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  sourceMessage: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  sourceErrorMessage: {
    color: ERROR_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  badgeReady: {
    backgroundColor: READY_SURFACE,
  },
  badgeReadyLabel: {
    color: READY_TEXT,
  },
  badgeWarning: {
    backgroundColor: WARNING_SURFACE,
  },
  badgeWarningLabel: {
    color: WARNING_TEXT,
  },
  badgeError: {
    backgroundColor: ERROR_SURFACE,
  },
  badgeErrorLabel: {
    color: ERROR_TEXT,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionButtonDisabled: {
    opacity: 0.56,
  },
  actionButtonLabel: {
    color: PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
});
