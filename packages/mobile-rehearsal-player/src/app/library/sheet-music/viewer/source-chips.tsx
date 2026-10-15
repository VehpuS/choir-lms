import type { SheetMusicSource } from '@org/audio-library-models';

import { InteractionChip } from '../../components/interaction-chip';

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
  return (
    <>
      {sources.map((source) => {
        const isSelected = source.id === selectedId;

        return (
          <InteractionChip
            accessibilityLabel={`Show ${source.label}`}
            accessibilitySelected={isSelected}
            key={source.id}
            label={source.label}
            onPress={() => onSelect(source.id)}
            variant={isSelected ? 'selected' : 'passive'}
          />
        );
      })}
    </>
  );
};
