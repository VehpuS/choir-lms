export type SectionHeadingContent = {
  body?: string;
  eyebrow?: string;
  hasTrailingAction?: boolean;
  title?: string;
};

export const hasSectionHeadingContent = ({
  body,
  eyebrow,
  hasTrailingAction = false,
  title,
}: SectionHeadingContent): boolean => {
  return Boolean(eyebrow || title || body || hasTrailingAction);
};
