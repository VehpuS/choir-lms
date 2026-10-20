import { validateLoopRange } from './rehearsal-domain.ts';
import type { TrackMarker } from './track-markers.ts';

export const INTRO_SECTION_NAME = 'Intro';

export type MarkerSectionSkipReason =
  | 'existing-loop'
  | 'too-short'
  | 'past-end'
  | 'duplicate-name';

export type MarkerSection = {
  /** Stable key for list rendering: the start marker id, or `intro`. */
  key: string;
  name: string;
  startMs: number;
  endMs: number;
  /** Present when the section should start unchecked, with the reason shown. */
  skipReason?: MarkerSectionSkipReason;
};

export type MarkerSectionPlan = {
  sections: MarkerSection[];
  /** True when the last marker produced no section because the length is unknown. */
  lastSectionNeedsDuration: boolean;
};

type ExistingLoopRange = { name: string; startMs: number; endMs: number };

type PlanMarkerSectionsOptions = {
  includeIntro: boolean;
};

const normalizeNameKey = (name: string): string => name.trim().toLowerCase();

const classifySection = (
  section: MarkerSection,
  existingLoops: readonly ExistingLoopRange[],
  usedNames: ReadonlySet<string>,
  durationMs?: number,
): MarkerSectionSkipReason | undefined => {
  if (!validateLoopRange(section.startMs, section.endMs).isValid) {
    return 'too-short';
  }

  if (durationMs !== undefined && section.endMs > durationMs) {
    return 'past-end';
  }

  if (
    existingLoops.some(
      (loop) =>
        loop.startMs === section.startMs && loop.endMs === section.endMs,
    )
  ) {
    return 'existing-loop';
  }

  return usedNames.has(normalizeNameKey(section.name))
    ? 'duplicate-name'
    : undefined;
};

/**
 * Sections between consecutive explicit markers, each named after its start
 * marker. The last section runs to the track end and is omitted when that is
 * unknown. Derived loop markers are never boundaries because the caller only
 * passes explicit markers. Unusable sections are kept and flagged so the
 * dialog can show why they start unchecked.
 */
export const planMarkerSections = (
  explicit: readonly TrackMarker[],
  durationMs: number | undefined,
  existingLoops: readonly ExistingLoopRange[],
  { includeIntro }: PlanMarkerSectionsOptions,
): MarkerSectionPlan => {
  const first = explicit[0];

  if (!first) {
    return { sections: [], lastSectionNeedsDuration: false };
  }

  const drafts: MarkerSection[] = [];

  if (includeIntro) {
    drafts.push({
      key: 'intro',
      name: INTRO_SECTION_NAME,
      startMs: 0,
      endMs: first.positionMs,
    });
  }

  explicit.forEach((marker, index) => {
    const next = explicit[index + 1];
    const endMs = next ? next.positionMs : durationMs;

    if (endMs === undefined) {
      return;
    }

    drafts.push({
      key: marker.id,
      name: marker.name,
      startMs: marker.positionMs,
      endMs,
    });
  });

  // Names of loops that already exist, then of earlier usable sections.
  const usedNames = new Set(
    existingLoops.map((loop) => normalizeNameKey(loop.name)),
  );
  const sections = drafts.map((draft): MarkerSection => {
    const skipReason = classifySection(
      draft,
      existingLoops,
      usedNames,
      durationMs,
    );

    if (!skipReason) {
      usedNames.add(normalizeNameKey(draft.name));
    }

    return skipReason ? { ...draft, skipReason } : draft;
  });

  return {
    sections,
    lastSectionNeedsDuration: durationMs === undefined,
  };
};
