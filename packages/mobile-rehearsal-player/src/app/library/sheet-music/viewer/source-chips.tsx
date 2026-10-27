import type { SheetMusicSource } from '@org/audio-library-models';
import { StyleSheet } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { appTheme } from '../../../utils/theme';
import { InteractionChip } from '../../components/interaction-chip';
import { isDeviceOffline } from '../../offline/device-connection';
import { useOfflineState } from '../../offline/offline-state';
import { resolveSourceChipLabels } from './source-chip-labels';

type SourceChipsProps = {
  onSelect: (sourceId: string) => void;
  selectedId: string;
  sources: readonly SheetMusicSource[];
};

const KEPT_ICON_SIZE = 14;
export const NEEDS_CONNECTION_HINT = 'Needs a connection';
const NO_FILE_ID = '';

type SourceChipProps = {
  isSelected: boolean;
  label: string;
  onPress: () => void;
  source: SheetMusicSource;
};

/**
 * One chip. A kept Drive score shows the kept icon; while the device is
 * offline, a source that is not kept (a linked page, or a Drive score that was
 * not kept) is dimmed and says it needs a connection.
 */
const SourceChip = ({
  isSelected,
  label,
  onPress,
  source,
}: SourceChipProps) => {
  const fileId =
    source.location.kind === 'drive' ? source.location.fileId : NO_FILE_ID;
  const isKept = useOfflineState(fileId) === 'kept';
  const needsConnection = !isKept && isDeviceOffline();

  return (
    <InteractionChip
      accessibilityHint={needsConnection ? NEEDS_CONNECTION_HINT : undefined}
      accessibilityLabel={`Show ${label}${isKept ? ', kept offline' : ''}`}
      accessibilitySelected={isSelected}
      label={label}
      leadingIcon={
        isKept ? (
          <AppIcon
            color={appTheme.colors.accentText}
            name="offline-kept"
            size={KEPT_ICON_SIZE}
          />
        ) : undefined
      }
      onPress={onPress}
      style={needsConnection ? styles.needsConnection : undefined}
      variant={isSelected ? 'selected' : 'passive'}
    />
  );
};

/** One chip per source, for moving between `Full score`, `Alto part`, and so on. */
export const SourceChips = ({
  onSelect,
  selectedId,
  sources,
}: SourceChipsProps) => {
  const labels = resolveSourceChipLabels(sources);

  return (
    <>
      {sources.map((source) => (
        <SourceChip
          isSelected={source.id === selectedId}
          key={source.id}
          label={labels[source.id] ?? source.label}
          onPress={() => onSelect(source.id)}
          source={source}
        />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  needsConnection: {
    opacity: 0.55,
  },
});
