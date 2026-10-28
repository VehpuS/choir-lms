import type { CentsZone } from '@org/audio-library-models';

import { appTheme } from '../../../utils/theme';

const { colors } = appTheme;

/** One colour per zone; the zone is always also stated in words. */
export const ZONE_COLORS: Record<CentsZone, { stroke: string; fill: string }> =
  {
    precise: { stroke: colors.success, fill: colors.successFill },
    near: { stroke: colors.warning, fill: colors.warningFill },
    'quarter-tone-off': { stroke: colors.caution, fill: colors.cautionFill },
    'off-pitch': { stroke: colors.danger, fill: colors.dangerFill },
  };
