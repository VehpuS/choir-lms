/**
 * Known raw color literals in `src/app/**` that predate the Nocturne tokens,
 * as file path (relative to `src/app`) → literal count.
 *
 * This list only shrinks. When a migration removes literals from a file,
 * lower or delete its entry; `theme-color-literal-guard.spec.ts` fails until
 * the baseline matches the source exactly.
 */
export const themeColorLiteralBaseline: Readonly<Record<string, number>> = {};
