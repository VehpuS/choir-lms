import type {
  MarkerSection,
  MarkerSectionPlan,
  MarkerSectionSkipReason,
} from '@org/audio-library-models';

import { formatMarkerTime } from '../markers-sheet/model';

export const INCLUDE_INTRO_LABEL = 'Include intro';
export const CREATE_LOOPS_TITLE = 'Create loops from markers';
export const NO_SECTIONS_MESSAGE = 'Add at least one marker to make sections.';
export const NEEDS_DURATION_MESSAGE =
  'The last marker needs the track length, which is not known yet.';

export const SKIP_REASON_LABELS: Record<MarkerSectionSkipReason, string> = {
  'duplicate-name': 'A loop with this name already exists',
  'existing-loop': 'Already a loop',
  'past-end': 'Past the end of this audio',
  'too-short': 'Too short to be a loop',
};

/** The user's checks that differ from the default (unchecked when skipped). */
export type SectionOverrides = Readonly<Record<string, boolean>>;

export type CreateLoopsRow = {
  key: string;
  name: string;
  rangeLabel: string;
  isChecked: boolean;
  /** A skipped section cannot be checked: it would not make a usable loop. */
  canCheck: boolean;
  skipLabel?: string;
};

export type CreateLoopsModel = {
  rows: CreateLoopsRow[];
  checkedCount: number;
  confirmLabel: string;
  canConfirm: boolean;
  /** Shown instead of the list when there is nothing to plan. */
  emptyMessage?: string;
  note?: string;
};

const isSectionChecked = (
  section: MarkerSection,
  overrides: SectionOverrides,
): boolean => {
  return !section.skipReason && (overrides[section.key] ?? true);
};

export const toggleSection = (
  overrides: SectionOverrides,
  section: MarkerSection,
): SectionOverrides => {
  if (section.skipReason) {
    return overrides;
  }

  return { ...overrides, [section.key]: !isSectionChecked(section, overrides) };
};

/** `Create 3 loops`, or `Create 1 loop`; nothing checked reads `Create loops`. */
export const formatConfirmLabel = (count: number): string => {
  if (count === 0) {
    return 'Create loops';
  }

  return `Create ${count} loop${count === 1 ? '' : 's'}`;
};

export const buildCreateLoopsModel = (
  plan: MarkerSectionPlan,
  overrides: SectionOverrides,
): CreateLoopsModel => {
  const rows = plan.sections.map(
    (section): CreateLoopsRow => ({
      key: section.key,
      name: section.name,
      rangeLabel: `${formatMarkerTime(section.startMs)} – ${formatMarkerTime(section.endMs)}`,
      isChecked: isSectionChecked(section, overrides),
      canCheck: !section.skipReason,
      ...(section.skipReason
        ? { skipLabel: SKIP_REASON_LABELS[section.skipReason] }
        : {}),
    }),
  );
  const checkedCount = rows.filter((row) => row.isChecked).length;

  return {
    rows,
    checkedCount,
    confirmLabel: formatConfirmLabel(checkedCount),
    canConfirm: checkedCount > 0,
    ...(rows.length === 0 ? { emptyMessage: NO_SECTIONS_MESSAGE } : {}),
    ...(plan.lastSectionNeedsDuration && rows.length > 0
      ? { note: NEEDS_DURATION_MESSAGE }
      : {}),
  };
};

/** The sections `Create N loops` will save, in order. */
export const resolveSectionsToCreate = (
  plan: MarkerSectionPlan,
  overrides: SectionOverrides,
): MarkerSection[] => {
  return plan.sections.filter((section) =>
    isSectionChecked(section, overrides),
  );
};
