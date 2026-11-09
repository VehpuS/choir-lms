import { CURRENT_LIBRARY_BUNDLE_FORMAT_VERSION } from './library-bundle.ts';

/**
 * Upgrades an older bundle to the current shape, one version at a time. Each
 * step takes the raw record of version `n` and returns the raw record of
 * version `n + 1`; the parser then reads the result like any current bundle.
 * Version 1 is the first format, so no step exists yet. When the format
 * changes, bump `CURRENT_LIBRARY_BUNDLE_FORMAT_VERSION` and register the step
 * for the version it upgrades from.
 */
export type LibraryBundleUpgradeStep = (
  record: Record<string, unknown>,
) => Record<string, unknown>;

export type LibraryBundleUpgradeSteps = Readonly<
  Record<number, LibraryBundleUpgradeStep>
>;

export const LIBRARY_BUNDLE_UPGRADE_STEPS: LibraryBundleUpgradeSteps = {};

/**
 * Runs every step from `record.formatVersion` up to `targetVersion`. Returns
 * `null` when a step in the chain is missing, which the parser reports as not
 * being a readable bundle rather than guessing. The steps and the target are
 * parameters so the upgrade path can be proven before a real second version
 * exists.
 */
export const upgradeLibraryBundleRecord = (
  record: Record<string, unknown>,
  formatVersion: number,
  steps: LibraryBundleUpgradeSteps = LIBRARY_BUNDLE_UPGRADE_STEPS,
  targetVersion: number = CURRENT_LIBRARY_BUNDLE_FORMAT_VERSION,
): Record<string, unknown> | null => {
  let upgraded = record;

  for (let version = formatVersion; version < targetVersion; version += 1) {
    const step = steps[version];

    if (step === undefined) {
      return null;
    }

    upgraded = { ...step(upgraded), formatVersion: version + 1 };
  }

  return upgraded;
};
