import { SegmentedControl } from '../../../components/segmented-control';
import type { TagFilterMatchMode } from '../utils/saved-library-search-view-model';

// Any / All in 1j's order; the default remains `All` (set by the caller).
const MATCH_MODE_OPTIONS: ReadonlyArray<{
  accessibilityLabel: string;
  label: string;
  value: TagFilterMatchMode;
}> = [
  {
    accessibilityLabel: 'Match any selected tag',
    label: 'Any',
    value: 'any',
  },
  {
    accessibilityLabel: 'Match all selected tags',
    label: 'All',
    value: 'all',
  },
];

type TagFilterMatchModeSwitchProps = {
  matchMode: TagFilterMatchMode;
  onSelectMatchMode: (value: TagFilterMatchMode) => void;
};

export const TagFilterMatchModeSwitch = ({
  matchMode,
  onSelectMatchMode,
}: TagFilterMatchModeSwitchProps) => {
  return (
    <SegmentedControl
      accessibilityLabel="Tag match mode"
      onSelect={onSelectMatchMode}
      options={MATCH_MODE_OPTIONS}
      selectedValue={matchMode}
      shape="pill"
    />
  );
};
