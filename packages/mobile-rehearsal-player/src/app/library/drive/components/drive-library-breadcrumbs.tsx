import type { DriveBrowseLocation } from '@org/google-drive';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { appTheme } from '../../../utils/theme';

type DriveLibraryBreadcrumbsProps = {
  navigationStack: DriveBrowseLocation[];
  onGoToLocation: (index: number) => void;
};

const PRIMARY_TEXT = appTheme.colors.text;
const SECONDARY_ACTION_TEXT = appTheme.colors.accentText;
const SECONDARY_TEXT = appTheme.colors.textMuted;

export const DriveLibraryBreadcrumbs = ({
  navigationStack,
  onGoToLocation,
}: DriveLibraryBreadcrumbsProps) => {
  if (navigationStack.length === 0) {
    return null;
  }

  return (
    <View style={styles.breadcrumbRow}>
      {navigationStack.map((location, index) => {
        const isCurrentLocation = index === navigationStack.length - 1;

        return (
          <View
            key={`${location.kind}:${location.id}`}
            style={styles.breadcrumbItem}
          >
            {index > 0 ? (
              <Text style={styles.breadcrumbSeparator}>/</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={isCurrentLocation}
              onPress={() => {
                onGoToLocation(index);
              }}
              style={({ pressed }) => [
                styles.breadcrumbButton,
                pressed && !isCurrentLocation
                  ? styles.breadcrumbButtonPressed
                  : undefined,
              ]}
            >
              <Text
                style={[
                  styles.breadcrumbLabel,
                  isCurrentLocation ? styles.breadcrumbLabelCurrent : undefined,
                ]}
              >
                {location.name}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  breadcrumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  breadcrumbSeparator: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    fontWeight: '600',
  },
  breadcrumbButton: {
    paddingVertical: 2,
  },
  breadcrumbButtonPressed: {
    opacity: 0.75,
  },
  breadcrumbLabel: {
    color: SECONDARY_ACTION_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  breadcrumbLabelCurrent: {
    color: PRIMARY_TEXT,
  },
});
