import { INTERACTION_CHIP_TOKENS } from './interaction-style-tokens';

/**
 * `passive` and `selected` are the two states of a toggle chip; `action` is a
 * chip that performs something; `tag` is a chosen tag (filled, per 1j).
 */
export type InteractionChipVariant = 'action' | 'passive' | 'selected' | 'tag';

type InteractionChipPalette = {
  background: string;
  border: string;
  isEmphasized: boolean;
  pressedBackground: string;
  text: string;
};

const INTERACTION_CHIP_PALETTES: Record<
  InteractionChipVariant,
  InteractionChipPalette
> = {
  action: {
    background: INTERACTION_CHIP_TOKENS.transparent,
    border: INTERACTION_CHIP_TOKENS.passiveBorder,
    isEmphasized: false,
    pressedBackground: INTERACTION_CHIP_TOKENS.passivePressedBackground,
    text: INTERACTION_CHIP_TOKENS.actionText,
  },
  passive: {
    background: INTERACTION_CHIP_TOKENS.transparent,
    border: INTERACTION_CHIP_TOKENS.passiveBorder,
    isEmphasized: false,
    pressedBackground: INTERACTION_CHIP_TOKENS.passivePressedBackground,
    text: INTERACTION_CHIP_TOKENS.passiveText,
  },
  selected: {
    background: INTERACTION_CHIP_TOKENS.transparent,
    border: INTERACTION_CHIP_TOKENS.selectedBorder,
    isEmphasized: true,
    pressedBackground: INTERACTION_CHIP_TOKENS.passivePressedBackground,
    text: INTERACTION_CHIP_TOKENS.selectedText,
  },
  tag: {
    background: INTERACTION_CHIP_TOKENS.tagBackground,
    border: INTERACTION_CHIP_TOKENS.tagBackground,
    isEmphasized: true,
    pressedBackground: INTERACTION_CHIP_TOKENS.tagBackground,
    text: INTERACTION_CHIP_TOKENS.tagText,
  },
};

export const resolveInteractionChipPalette = (
  variant: InteractionChipVariant,
): InteractionChipPalette => {
  return INTERACTION_CHIP_PALETTES[variant];
};
