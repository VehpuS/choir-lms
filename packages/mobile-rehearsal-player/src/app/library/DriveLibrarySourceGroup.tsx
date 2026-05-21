import { map } from 'es-toolkit/compat';
import { StyleSheet, Text, View } from 'react-native';

import {
  getSourceAvailabilityLabel,
  getSourceMetadataLabels,
  getSourceStatusMessage,
  type DriveLibrarySource,
} from './drive-library-view-model';

type DriveLibrarySourceGroupProps = {
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

const DriveLibrarySourceCard = ({ source }: { source: DriveLibrarySource }) => {
  const metadataLabel = getSourceMetadataLabels(source).join(' • ');
  const statusMessage = getSourceStatusMessage(source);

  return (
    <View style={styles.sourceCard}>
      <View style={styles.sourceHeader}>
        <Text style={styles.sourceName}>{source.name}</Text>
        <View style={[styles.badge, getAvailabilityBadgeStyle(source)]}>
          <Text style={[styles.badgeLabel, getAvailabilityLabelStyle(source)]}>
            {getSourceAvailabilityLabel(source)}
          </Text>
        </View>
      </View>
      <Text style={styles.sourceMetadata}>{metadataLabel}</Text>
      {statusMessage ? (
        <Text style={styles.sourceMessage}>{statusMessage}</Text>
      ) : null}
    </View>
  );
};

export const DriveLibrarySourceGroup = ({
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
          return <DriveLibrarySourceCard key={source.id} source={source} />;
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
});
