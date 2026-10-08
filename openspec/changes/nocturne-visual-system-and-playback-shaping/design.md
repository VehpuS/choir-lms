## Context

This change couples a visual-system migration with a new playback capability. They are proposed together because the new capability needed a home in the redesigned playback surface, and because retuning every style block twice would be wasteful. They are separable at the phase boundary: task groups 1–4 (visual system and waveform) ship without groups 5–6 (playback shaping), and the reverse is also true at higher cost. Group 9 (multiple selection and bulk actions, Decisions 9–10) depends only on groups 1–2 and is separable from groups 3–6. Throughout this change, "group N" means the numbered section `N.` in `tasks.md`.

## Decision 1 — Tokens replace `appTheme`, and nothing hard-codes a hex

`src/app/utils/theme.ts` currently exports eight literal colors, and dozens of style blocks bypass it with inline hexes (`#305c4d`, `#faf6ee`, `#173229`, `#d6d1c4`, `#1f5c40`, `#9a4d2d` and others). Nocturne's rule is that every color, radius, and spacing value comes from a token.

- Rewrite `appTheme` as the full Nocturne token set: `bg`, `surface`, `text`, `accent`, `divider`, the `neutral` and `accent` 100–900 ramps, `radius` (sm 4 / md 8 / lg 14), `space` (the 0.70× scale), and the three elevation steps.
- Status colors are an app-specific extension: Nocturne and the 1a–1j mockups define none, but Drive errors, unsupported-format warnings, and saved/ready states need them. Add muted `danger` / `warning` / `success` tokens — a desaturated text step at ≥4.5:1 on `bg` and `surface` plus a low-alpha tinted fill, mirroring `accentRegionFill` — so status reads without flooding a hue. Status always pairs with an icon or label, never color alone.
- Migration order: after the token rewrite, run a color-only pass (task 1.2.1) that moves every hard-coded color onto tokens before any structural restyle. Converting colors per screen in later tasks would leave light surfaces under light token text in the meantime, which is a legibility regression, not just an inconsistency.
- Add a lint or test guard that fails on a raw hex in `src/app/**` outside `theme.ts`. Without a guard this migration silently regresses the first time someone adds a screen.
- Alternative considered: a React context theme provider. Rejected for now — the app has one theme, and a static token object keeps every existing `StyleSheet.create` call site working with a one-line change.

## Decision 2 — Elevation is an edge, not a stack of shadows

On a dark ground Nocturne expresses elevation as a hairline plus ambient darkness. React Native has no `box-shadow`, so the hairline is `borderWidth: 1` / `borderColor` from the neutral ramp (or an inset-equivalent), and the ambient part uses the platform shadow/elevation props sparingly. The current `destination-header` shadow stack (`shadowRadius: 20`, `elevation: 6`, on top of a filled hero) is replaced by a single edge.

## Decision 3 — Icons move to Phosphor

Nocturne specifies Phosphor. The app uses `@expo/vector-icons`' MaterialCommunityIcons throughout, including in the already-specified icon-semantics requirement (repeat/shuffle distinctness, drag handles, transport). Migrate to `phosphor-react-native`, mapping one-for-one, and re-verify the repeat-vs-shuffle distinctness scenario against the new glyph family — Phosphor's `Repeat` / `RepeatOnce` / `Shuffle` set satisfies it, but the previous change's finding (that a repeat family can collapse into shuffle's shape) must be re-checked, not assumed.

Filled weights are a separate weight prop in Phosphor, not a name suffix; the transport play/pause glyphs use the filled weight and the state icons use regular.

## Decision 4 — Waveform peaks come from real analysis

Requires a peak-extraction path that works for a Drive-hosted file the app streams rather than owns:

1. **Client-side decode on first play.** Fetch the audio (already streamed), decode to PCM, downsample to a fixed bucket count (e.g. 800 min/max pairs), cache the peak array in `local-library-storage` keyed by `driveFileId` + a Drive content version. `DriveAudioSource` stores `modifiedTime` today but no revision id; the spike (task 4.1) decides whether to add `headRevisionId` / `md5Checksum` to the Drive fields requested in `packages/google-drive` or to key on `modifiedTime`. Provenance refresh on rediscovery (from `improve-drive-search-and-bulk-library-import`) already rewrites Drive-owned metadata, so a changed version naturally misses the cache. Web uses `AudioContext.decodeAudioData`; native needs a decode bridge.
2. **Progressive peaks from the playback engine.** Cheaper, but yields no waveform for the unplayed portion — which is the part the user scrubs into. Rejected.
3. **Server-side precompute.** No backend exists in this repo. Out of scope.

**Decided (2026-09-30, after the task 4.1 spike):** peaks are one unsigned byte per bucket, with one bucket per millisecond up to 120,000 buckets, so a track shorter than two minutes gets fewer buckets and a longer one stretches each bucket (a 5-minute track is 2.5 ms per bucket, 120 KB). The cache key is `driveFileId` plus Drive `modifiedTime`; no extra Drive fields are requested. Web decodes the bytes the player already downloaded (`decodeAudioData`, 242 ms for 5:34 measured) and stores peaks in IndexedDB, because 120 KB per track does not fit `localStorage`. Native has no decoder: a pure-JS MP3 decode took 42.8 s for 5:34 in Node alone, so native keeps the flat band until a cheaper extractor exists (task 8.41).

Option 1 is the recommendation, with a documented fallback: until peaks are available for an item, render a neutral flat band rather than a fake waveform, so the UI never implies analysis it does not have. The peak cache should be versioned so a changed Drive revision invalidates it.

## Decision 5 — Adjusted entities store a transform, not rendered audio

An adjusted track or loop is `{ id, name, sourceRef, range?, transform: { speedMultiplier, pitchSemitones, tempoSource } }`, persisted alongside saved tracks and loops, and applied by the playback engine at play time.

- Consistent with the existing by-reference Drive model — no audio is copied, and nothing is stored that the "no offline playback" MVP boundary forbids.
- An adjusted loop is a loop with a transform; an adjusted track is a saved track with a transform. Both reuse existing playable-item plumbing rather than introducing a fourth entity kind, which keeps queue, playlists, tags, and search working with no per-feature changes.
- Duration shown for an adjusted entity is the source duration divided by the speed multiplier, computed, not stored.
- An adjusted entity has no Drive provenance of its own. Original-location actions (`Show in Add`, `Open in Google Drive`) and availability resolve through `sourceRef`, and the bulk-import planner's canonical-source reuse (keyed on `driveFileId`) only considers saved sources, so an import never reuses, links, or reports an adjusted entity as "already present".
- Removing a source track cascades to its adjusted entities the same way it cascades to its loops, and the confirmation summary lists them.
- Alternative considered: render and store transformed audio. Rejected — needs offline storage, a render pipeline, and an audio-license question, and it duplicates material the choir already shares.

## Decision 6 — Two independent axes, no pitch lock

- `speedMultiplier`: continuous float, clamp 0.25–2.00 (widened from the proposed 0.50–1.50 by the user, 2026-10-02), default 1.0, never alters pitch.
- `pitchSemitones`: integer, clamp −12…+12, default 0, never alters tempo.

Because the two are independent and speed always preserves pitch, a pitch-lock affordance would be a control with one state. It is prohibited by the spec delta so it cannot creep back in as a "standard" transport icon.

Engine implications: this needs time-stretch and pitch-shift independently. Native (SwiftAudioEx / AVAudioEngine) has `AVAudioUnitTimePitch`, which does both. Web needs a Web Audio graph — `playbackRate` alone shifts pitch and is therefore not sufficient on its own; a phase-vocoder or SoundTouch-style node is required. Verify feasibility on both platforms at the task 5.0 gate before committing to groups 5–6; `docs/mobile-cross-platform-audio-playback.md` must be updated with whatever the playback abstraction gains.

**Gate 5.0 result (2026-10-02, supersedes the engine claims above where they differ):** speed is pitch-preserving on every platform with the installed stack (web `playbackRate` keeps pitch by default via `preservesPitch`; iOS AVPlayer with the `Music` pitch algorithm; Android ExoPlayer speed). Independent semitone pitch is feasible on web (SoundTouch AudioWorklet fed by `createMediaElementSource`, about 0.1% of a core on a 5-minute track) but not on native with RNTP / `SwiftAudioEx` (AVPlayer-based, no `AVAudioUnitTimePitch`; RNTP exposes no ExoPlayer pitch). Decision (user, 2026-10-02): ship speed everywhere and pitch on web only. Native pitch is explicitly out of scope and not planned; it is revisited only if native becomes a priority (tasks.md 8.51). Until then the limitation must be visible in code (a single documented capability, `canShapePitch`, that is false on native and cited wherever pitch is gated) and in the UI (inert stepper with a stated reason, never hidden, never a tempo-changing approximation). Where pitch is unavailable the stepper is shown inert with a short reason, never hidden and never faked, and the engine reports a `canShapePitch` capability.

## Decision 7 — Tempo source as an extension point

Speed carries `tempoSource: 'multiplier' | 'bpm' | 'score'`. Only `'multiplier'` is implemented. The shaping surface shows all three with the unimplemented two visibly inert, so the eventual BPM and score-follow work adds a mode rather than relocating the control. Score-follow implies a tempo map (a time → rate curve) rather than a scalar, so the transform type should be modeled as `multiplier | tempoMap` from the start even while only the scalar branch is built.

## Risks

- **Playback-engine capability is the gating risk (resolved at 5.0 for speed everywhere and pitch on web; native pitch remains open, 8.51).** If web cannot do pitch-preserving time-stretch at acceptable quality, speed/pitch may have to be native-only, which contradicts the GitHub Pages web build being a real target. Resolve at the task 5.0 gate before building UI.
- **Breadth of the restyle.** Every screen changes. Mitigated by doing tokens first and a shared-primitive pass second, so most screens change by inheritance rather than by hand.
- **Adjusted entities multiply library rows.** A singer who saves three speeds of one passage gets three rows. Mitigated by showing the transform and source name in the row's meta line. Adjusted tracks and loops are ordinary top-level files in the Files tree, named independently (they can be renamed) and ordered only by the active sort; they are not grouped or indented under their source (user decision 2026-10-06, reversing the grouping first built in 6.6).

## Decision 8 — Surfaces without a mockup inherit primitives, not bespoke styling

Several surfaces shipped after the 1a–1j mockups were drawn: Drive search selection mode (`drive-search-selection-toolbar`, selected-state rows in `drive-explorer-list` / `drive-explorer-folder-row`), the Drive import review screen (`screens/drive-import-review/**`: destination picker, mode picker, summary counts, progress, completion), the original-location actions in the saved-track options menu, `AsyncActionStatusCard`, and the `DestinationHeader` subtitle. Each carries its own inline hexes and filled `listMarker` primary buttons today.

- Restyle them by composing the converted shared primitives — row anatomy, accent-outline primary / neutral-outline secondary actions, `FeedbackCard` / `AsyncActionStatusCard`, `bottom-sheet-surface`, `interaction-chip` — rather than drawing new mockups first. Where a surface needs a pattern the mockups don't show, borrow the closest mockup: selection toolbar and selected rows from 1e rows + 1j chips, import review from 1h's pinned two-action footer and 1j's kicker/segmented controls, import progress from the 2 px accent progress line, completion from the 1e save-acknowledgment card.
- Extract a shared outlined action button (accent and neutral variants) in task 1.4, since the import review footer, the selection toolbar, Play all / Shuffle, Save loop, and the queue footer all need the same thing, and each currently hand-rolls a filled button.
- Row selection glyphs map to Phosphor `circle` (unselected) and fill-weight `check-circle` (selected), with the selected state also conveyed through the row's accent title treatment — never by color alone (existing icon-only accessibility scenario).
- If implementing one of these surfaces turns up a real design question rather than a token swap, stop and ask for a mockup instead of improvising (per the deliberate-execution loop).

## Decision 9 — Multiple selection is one model, one hook, and a few primitives

Today selection exists only for Drive search results: `drive-search-selection-model.ts` (state bound to a query context key, with `Select all matching`, as it was then called, tracking a live, paginating result set), `use-drive-search-selection.ts`, `drive-search-selection-toolbar.tsx`, and a `selected` / `active` pair threaded through `ExplorerListRow` and the Drive rows (2.9 added `getDriveRowSelectionGlyph`). Adding Add-browse and Library selection by copying that pattern would produce three diverging implementations.

- **Pure model** (framework-agnostic, in the app for now, e.g. `src/app/library/selection/selection-model.ts`): `SelectionState<TItem>` holds `isActive` and an insertion-ordered map of `key → item`, with `enter`, `cancel`, `toggle`, `selectMany`, `deselectMany`, and `prune(validKeys)`. Items are stored, not only keys, because Add's basket must show and import items whose folder is no longer on screen. The model knows nothing about Drive or Library; it could move to a shared package later if another app needs it.
- **Select-all as a layered extension**, not a model feature: Drive's `Select all` becomes a small reducer over the base model that tracks one pending source (query context + excluded keys) and feeds pages into `selectMany` until complete. A context change ends the pending source and keeps what it added (see the `mobile-rehearsal-player-usability` delta).
- **Hook** `useSelection` wraps the model with stable callbacks and a `selectedKeys` set; surface-specific hooks (`useDriveSelectionBasket`, `useLibrarySelection`) compose it and supply identity functions and pruning.
- **Primitives**: `ExplorerListRow` takes a `selection?: { selected: boolean; onToggle }` prop and renders the glyph itself (the generalized `getDriveRowSelectionGlyph`), hides trailing controls, sets `accessibilityState.selected`, and wires long-press to enter selection. A `SelectionBar` (count live region, `Cancel`, optional secondary action such as `Select all matching` or `View selection`) replaces `drive-search-selection-toolbar`. A `BulkActionBar` pins to the bottom like 1h's two-action footer, over the mini-player / tab band, with up to three outlined actions and an overflow sheet for the rest.
- **Action resolution is pure and tested**: `resolveBulkActions({ surface, items })` returns the visible actions with enabled state, the reason when disabled, and the effective item count. `expandSelectionForPlayback(items, library)` performs the folder / playlist expansion in display order. The UI only renders what these return.
- **Identity**: Drive items key on Drive file / folder id (the basket spans roots, so ids, not paths). Library items key on the row's identity in that view: file-link id in Files (the same entity can be selected through two links, and move / delete act on links), entity id in Tracks / Loops / Playlists / tag detail / search, and entry id in playlist detail (a repeated item is two entries).

## Decision 10 — Bulk actions batch existing operations; they add no new semantics

- Each bulk action reuses the single-item operation's rules — link-vs-entity semantics, case-insensitive name uniqueness, invalid move targets, track removal cascade, playlist naming, transient-queue promotion — and applies them to many items in one pass.
- **One persisted write per action.** `library-files-operations.ts` and `audio-library-runtime` gain batched variants that compute the next library state once and persist it once, so a reload never shows half an action and playback / queue reconciliation runs once. Bulk import already has its own recoverable executor and is unaffected.
- **Containers expand only for playback and playlist actions** (`Play next`, `Add to queue`, `Add to playlist`, `Save as playlist`): these are about the audio the user wants to hear. Copy, move, tag, and destructive actions act on the selected nodes, because expanding a folder for `Remove from library` would silently delete far more than the user selected. Folders are excluded from `Copy to folder` and `Remove from library` with an explicit count, because neither operation exists for folders today.
- **Aggregated confirmation.** Destructive actions reuse the existing impact summaries (folder delete, last-link delete, track removal cascade) and sum them across the selection before one confirmation; the inspect-affected-entities affordance lists the union.
- **Conflicts in one pass.** Bulk copy / move computes all destination-name conflicts up front and shows one list with keep-both (unique `Copy` proposal) or skip per item, instead of a dialog per item.

## Decision 11 — Headers spend as little height as possible

Decided by the user (2026-09-29): vertical space goes to content rows, not to header chrome.

- A destination header is its large title plus trailing actions and nothing above it. No destination carries a kicker (eyebrow) over its title. This deliberately departs from design screen 1a, which shows `CHOIR LMS` over `Recents` while 1b–1e show no kicker on `Library` or `Add` (task 8.24).
- Within a destination, a view or section header is at most one compact line (a kicker with a count, plus that view's sort or primary actions), and never restates what the selected view pill or the destination title already says. Descriptive helper paragraphs belong in empty states, not above populated lists. Task 8.25 applies this to the Library views.

## Decision 12 — No full-screen waveform outside an editing task

Decided by the user (2026-09-30), after 3.1 first built 1g's full-screen state as a toggle from the playback sheet: without the loop editor it only enlarged a waveform the sheet already scrubs, and mainstream players have no such toggle.

- The playback surface is one sheet (1f). Nothing on it exists only to enlarge the waveform.
- A full-screen waveform is part of an editing task, entered through that task's action (for example `Make loop` / `Edit loop`) and left by saving or cancelling. Screen 1g is that task's layout; task 3.4 decides the loop editor's entry points and whether it replaces the Library loop builder.
- A wide waveform in landscape is a possible later exploration (the app is portrait-locked today), not part of this change.

## Decision 13 — Every action answers at once, and loading never moves the interface

Decided by the user (2026-10-01), after the loop editor (tasks 3.4 / 8.45) and Add's folder navigation (task 2.13) showed the difference between work that takes time and an interface that goes quiet while it does.

- The reaction to a tap is immediate and does not wait for data: the destination, sheet, or selection changes in the same frame, and any wait is shown as a loading state inside the new surface. Work may take as long as it takes; the response may not.
- A loading indicator stays up for exactly as long as something is outstanding. It does not clear when one stage of a chain ends while a later stage is still running, and it is replaced by the result, not by an empty or warning state that the result will then contradict.
- Loading is shown in place. It occupies the area that will hold the result, or a fixed slot, and it never inserts a card that shifts the navigation, hides the navigation tree, or pushes the content the user is aiming at. Status text is short and replaces itself rather than stacking.
- A surface never shows the previous location's content under the new location's title.
- Where data already exists (cached or just seen), it is shown first and refreshed behind, so going back is instant.

## Decision 14 — Add's search reports one status line, in one place

Raised by the user (2026-10-06), after 9.3 verification showed the search status card moving the whole list.

- A Drive search shows its summary (`36 folders · 12 tracks`, form confirmed by the user 2026-10-06, in the same form whether or not discovery has finished) as a single line at the top of the results, above the first row, from the first page of results until the search ends. While discovery is still running, the line carries a small inline indicator and nothing else; when it ends the indicator goes away and the line stays. An incomplete or failed discovery changes that same line (a short reason and a retry), not a separate card.
- The `Loading more results` card (title, count message, `Complete Drive discovery is still in progress.`, spinner row) is removed. It repeated the first-load card's `Searching Google Drive…` and, by appearing and disappearing, moved the list by over a hundred points (Decision 13 forbids exactly this). The first-load state before any result exists uses the same fixed slot, not a different card.
- The search field sits below the `My Drive` / `Shared folders` switcher, so the scope it searches is implied by where it is. The `Search in My Drive` helper line above the field is removed, and the placeholder is just `Search` (confirmed 2026-10-06; the field keeps an accessible name that does name the scope, for screen readers).
- The summary line is also where the selection basket's `Select all` operates (Decision 9); it does not move when selection mode starts.

## Decision 15 — Interface copy is sentence case

Raised by the user (2026-10-06): casing is inconsistent (`Edit Selection`, `All Files`, `Loading Files`, `Library Files unavailable` beside `Remove from library`, `Preserve structure`) and must be one explicit rule, enforced.

- **Rule.** Every piece of interface text — buttons, row and menu actions, titles, section and sheet headings, chips, placeholders, status and error messages, helper text, and accessibility labels — is written in sentence case: the first word is capitalized and everything else is lowercase unless it is a proper name.
- **Proper names that keep their capitals:** the product's destinations and the places it names (`Library`, `Add`, `Recents`), Google's own names (`Google Drive`, `Drive`, `My Drive`), and names the user or a file supplies (file names, folder names, playlist and loop names, tags). A generic noun after a proper name stays lowercase (`Library files unavailable`, `Shared folders`, `Drive browser`). `Library` is a generic noun in running copy, decided by the user (2026-10-06): `Save to library`, `Remove from library`, `Library files unavailable`; it is capitalized only as the first word (including the destination's own title and tab label). `Add` and `Recents` stay capitalized when named mid-sentence (`Show in Add`), because lowercase `add` reads as a verb; they are the only destination names on the allowlist.
- **All-caps is styling, not copy.** Kickers and eyebrows (`CURRENT FOLDER`) are sentence-case source text rendered with `textTransform: 'uppercase'`, so the copy stays in one form and tests, accessibility readers, and search see the same words.
- **Enforcement.** Copy lives in the surface's copy module or a named constant where it can be reached (as `selection-copy.ts` already does); a spec-level guard scans the copy modules and JSX string props for two or more consecutive capitalized words that are not on a small proper-name allowlist, and fails the build on a new violation (the same shape as the raw-color guard from 1.2). The guard lists today's violations when it is introduced and the audit task fixes them before turning it on.

## Decisions for multiple selection (resolved at task 9.0, 2026-10-06)

Decided by the user. No new mockups were drawn: selection states borrow 1e (Add rows and footer), 1h (two-action footer, review list) and 1j (Library rows and menus) per Decision 8; implementation tasks verify them in the browser.

- **Bulk-action bar layout.** Every Library surface that lists tracks, loops, or playlists shows the same three always-visible actions: `Play next`, `Add to queue`, `Add to playlist`. Everything else (copy, move, tags, remove, `Save as playlist`, ...) lives in the overflow sheet, resolved per surface by `resolveBulkActions`. Add's bar shows `Continue` and `Clear`.
- **Long-press entry.** Long-press enters selection on every surface. It does not clash with playlist detail's drag handle; reorder is disabled while selecting.
- **Basket view.** The basket is shown with the existing import review list, grouped by root and path with per-item deselect, not a new surface or sheet. Any capability the review list lacks (deselecting from the basket, showing items outside the current folder, a pre-import entry state) is added to it by task 9.4.
- **Undo.** Non-destructive batch changes (move, copy) offer undo on the completion acknowledgment, implemented by restoring the single persisted pre-action state (Decision 10). Destructive actions keep the aggregated confirmation and have no undo.
- **Select-all control.** Decided by the user's feedback (2026-10-06): `Select all matching` is too long for the selection bar, and after selecting everything the control gave no way back. The control is a single toggle labelled `Select all` and, once every result of the active context that is loaded so far is selected, `Deselect all`. `Deselect all` removes only that context's results and ends any pending gathering; it is not `Clear`, which empties the whole basket. Text labels are used rather than an icon-only control so the state change reads at a glance and is announced; the user confirmed text only (2026-10-06), so no icon variant is planned. Library selection (9.8) offers the same toggle over the rows of the current view after its filters.
- **Select entry control.** Decided by the user's feedback (2026-10-07): a text `Select` button in its own row cost a row of whitespace and did not say what it was for. Selection is entered through one 44pt checklist icon button (`select-multiple`, accessible label `Select`) in the trailing slot of the surface's existing header row (Add's navigation bar; each Library view's header; playlist detail, tag detail and Library search headers). It is the shared `SelectEntryButton` in `library/selection/`; no surface builds its own entry control or row, and `select-entry-guard.spec.ts` fails on a `select-multiple` icon or `Select` label outside that component. `Select all` / `Deselect all` stay text (above). Long-press entry is unchanged. Confirm the icon is clear on a device; a one-time `Select` caption is the fallback.
- **Partial folder state (planned 2026-10-07, decided 2026-10-08).** A folder that is not selected, not inside a selected folder, and has a selected item beneath it shows a third state, a minus in the circle, so the basket does not look empty at the level where its items are hidden. State is derived, never stored: ancestors of the selected items (from their paths in Add, from the folder tree in Library) minus selected and covered folders. The glyph differs by shape from the check and the empty circle (never color alone) and exposes `aria-checked="mixed"`. A partial row gets no accent title and no active mark, since it is not selected itself. Tapping selects the whole folder, exactly as for an unselected folder, and replaces the items already selected inside it (user, 2026-10-08), so the count shows the folder alone; deselecting it then leaves nothing selected beneath it. It is never promoted to selected just because every loaded row is.
- **Playlists inside a selected folder (decided 2026-10-08).** Expanding a folder for a playback or playlist action may meet playlist links. Including them is safe, since a playlist holds only tracks and loops and cannot recurse, but whether the user wants them is their call, so the system asks (`Include playlists` / `Skip playlists`) only when a selected folder actually contains playlist links. An included playlist contributes its entries in playlist order at its link's position in the folder's display order.
- **Repeated items (decided 2026-10-08).** The same track or loop can reach one action more than once (selected directly and via a folder, repeated inside a playlist, in two selected folders). The system asks (`Keep repeats` / `Remove repeats`) only when repeats exist. Removing keeps each item's first occurrence in display order. A playlist built with deliberate repeats is therefore not silently collapsed.
- **Bulk action preferences (decided 2026-10-08).** Both questions share one small on-device preference store (new; the app has no preferences store yet, only the search-history storage pattern). Each preference is `Ask each time` (initial), or one of the two answers. The prompt lets the user mark their answer as the default; a stored default skips the prompt. Because an `always` default would otherwise be invisible, the stored defaults are shown and resettable from a preferences surface (placement to be explored with the user before building; see task 9.5.1).
