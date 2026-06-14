import { INTERACTION_CHIP_TOKENS } from './interaction-style-tokens';

export type InteractionChipVariant = 'action' | 'passive' | 'selected';

type InteractionChipPalette = {
  background: string;
  pressedBackground: string;
  text: string;
};

const INTERACTION_CHIP_PALETTES: Record<
  InteractionChipVariant,
  InteractionChipPalette
> = {
  action: {
    background: INTERACTION_CHIP_TOKENS.passiveBackground,
    pressedBackground: INTERACTION_CHIP_TOKENS.passivePressedBackground,
    text: INTERACTION_CHIP_TOKENS.actionText,
  },
  passive: {
    background: INTERACTION_CHIP_TOKENS.passiveBackground,
    pressedBackground: INTERACTION_CHIP_TOKENS.passivePressedBackground,
    text: INTERACTION_CHIP_TOKENS.passiveText,
  },
  selected: {
    background: INTERACTION_CHIP_TOKENS.selectedBackground,
    pressedBackground: INTERACTION_CHIP_TOKENS.selectedBackground,
    text: INTERACTION_CHIP_TOKENS.selectedText,
  },
};

export const resolveInteractionChipPalette = (
  variant: InteractionChipVariant,
): InteractionChipPalette => {
  return INTERACTION_CHIP_PALETTES[variant];
};