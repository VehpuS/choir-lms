import { SurfaceIconButton } from '../../components/surface-icon-button';
import { SELECTION_COPY } from './selection-copy';

type SelectEntryButtonProps = {
  onPress: () => void;
};

// The one control that enters selection mode: a 44pt checklist icon in the
// trailing slot of the screen's header row (design Decision 9, "Select entry
// control"). Every selectable surface uses this component so the glyph, label
// and size cannot drift; none builds its own `Select` button or row.
export const SelectEntryButton = ({ onPress }: SelectEntryButtonProps) => (
  <SurfaceIconButton
    accessibilityLabel={SELECTION_COPY.enter}
    icon="select-multiple"
    onPress={onPress}
  />
);
