import type { SheetMusicSource } from '@org/audio-library-models';

import { InteractionChip } from '../../components/interaction-chip';
import { resolveSourceChipLabels } from './source-chip-labels';

type SourceChipsProps = {
  onSelect: (sourceId: string) => void;
  selectedId: string;
  sources: readonly SheetMusicSource[];
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
      {sources.map((source) => {
        const isSelected = source.id === selectedId;

        return (
          <InteractionChip
            accessibilityLabel={`Show ${labels[source.id]}`}
            accessibilitySelected={isSelected}
            key={source.id}
            label={labels[source.id] ?? source.label}
            onPress={() => onSelect(source.id)}
            variant={isSelected ? 'selected' : 'passive'}
          />
        );
      })}
    </>
  );
};
