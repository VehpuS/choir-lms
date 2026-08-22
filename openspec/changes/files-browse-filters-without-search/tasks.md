## 1. Recursive folder-match helper

- [ ] 1.1 Add a `folderContainsMatchingEntity`-style helper (colocated in `library-files-model/`, e.g. `build-default-rows.ts` or a small sibling file) that, given a folder id, the file tree, the saved entity maps, and the active `entityFilter`/`selectedTagFilters`, uses `resolveRehearsalLibraryFolderSubtreeIds` to find the folder's full descendant-folder-id set and returns whether any file link in that set resolves to an entity matching both `matchesEntityFilter` and `matchesSelectedTags`, mirroring `buildSearchRows`'s per-item matching.
- [ ] 1.2 Add focused tests for the helper: no filter active (trivially true or bypassed), matching entity one level down, matching entity several levels down, no matching entity anywhere in the subtree, entity-filter and tag-filter combined (both must pass), and a folder whose own tags match but contains no matching entity.

## 2. Apply filters during plain browsing

- [ ] 2.1 Thread `entityFilter` and `selectedTagFilters` into the `buildDefaultRows` call in `library-files-model/index.ts` (currently only `sortDirection`/`sortMode`/`openedAtByNodeKey` are passed for the non-search path).
- [ ] 2.2 In `build-default-rows.ts`, filter direct-child track/loop/playlist rows using `matchesEntityFilter`/`matchesSelectedTags` (same semantics as `buildSearchRows`), and filter direct-child folder rows using the new helper from 1.1 (visible if the folder's own tags match the active `Tags` filter, or it recursively contains a match) — but skip all of this filtering entirely when `entityFilter === 'all'` and `selectedTagFilters` is empty, so the default (no-filter) case has zero behavior change and no extra computation.
- [ ] 2.3 Add focused tests in `library-files-model-sort.spec.ts` or a new colocated spec covering: `Show: Tracks` while browsing hides non-track leaf rows and folders with no track anywhere inside; a `Tags` filter while browsing hides non-matching leaf rows and folders with neither a matching tag nor a matching descendant; a folder matching only via its own tags stays visible; combining `Show` and a `Tags` filter narrows to items matching both; the no-filter (`all`, empty tags) case is byte-for-byte unchanged from current behavior.

## 3. Final validation

- [ ] 3.1 Manually verify in the integrated browser: with a multi-level folder tree and mixed saved entity types, selecting `Show: Tracks`/`Loops`/`Playlists` while browsing (no search) narrows the current folder's rows and hides non-matching subfolders; selecting a `Tags` filter does the same; a subfolder several levels deep containing a lone match stays reachable from the top; clearing filters restores the original unfiltered listing; `Scope` and `Sort` continue behaving exactly as before.
- [ ] 3.2 Run project typecheck and lint on touched files, and the narrowest relevant Nx test targets for `mobile-rehearsal-player`, before considering this change ready to archive.
