## 1. Model, storage, and ownership

- [x] 1.1 Add `markers?: TrackMarker[]` and `TrackMarker` to `DriveAudioSource` in `packages/audio-library-models`, with the normalization from design Decision 1 (position, name, unique ids, ordering, 200 cap, `Marker N` repair) applied where a source is read, and an empty list removing the field. Spec the parser, including negative and non-finite positions, duplicate ids, missing names, over-long names, over-limit lists, and an old record without the field.
- [x] 1.2 Add `resolveMarkerOwner(item, sources)` reusing the existing lyrics/sheet-music owner resolver (track, adjusted track, loop, loop of an adjusted track, missing owner). Spec every case.
- [x] 1.3 Add `deriveLoopMarkers`, `buildMarkerList` (merge, order, filter, loop range window, `isPastEnd` flag), and `nextMarkerName`. Spec: loops of an adjusted copy included, loop edit and delete, equal positions ordering, range window inclusive, past-end flagging, `Marker N` filling gaps.
- [x] 1.4 Add `planMarkerSections` (design Decision 7): consecutive explicit markers, last section to the track end (needs a duration), optional `Intro`, skip of an existing identical loop, too-short sections, and name reuse. Spec each rule and that derived markers are never boundaries.
- [x] 1.5 Persist the field through the practice repository and AsyncStorage in `packages/audio-library-runtime` with `addMarker`, `renameMarker`, `moveMarker`, `deleteMarker` (and undo by re-adding), each updating only that field. Round-trip in the storage specs, confirm an old record loads, the 200 limit is enforced, and removing a track removes its markers.
- [x] 1.6 Expose markers through the library controller (`use-rehearsal-library-controller`): `markersFor(item)` through the owner resolver plus derived loop markers, and the write operations, with a controller spec for add, rename, move, delete, a derived item, and a loop being edited.

## 2. Preference

- [x] 2.1 Add the `markers-filter-preference` store (`choirlms.markers.filter`, `all` | `mine`, default `all`, unknown value falls back) shared by the sheet, the picker, and the flags. Spec defaults, storage failure, and parsing.

## 3. Playback jumping

- [x] 3.1 Add a `jumpToMarker` operation on the playback controller: seek by absolute audio position when the owner (or a matching loop or adjusted copy) is loaded, preserving the play state; otherwise load the originating item and start from the position, seeking on ready; clamp inside the loop in a loop context. Check the existing seek and loop-range handling first and record the finding here. Spec with the controller fakes: playing, paused, unloaded, loop clamp, and a past-end marker refused.
  - Finding: the player already seeks in absolute audio seconds and `loadPlayableItemIntoPlayer` already takes `initialPositionSeconds` and `shouldPlay`, so "start from the marker" needs no seek-on-ready. A seek leaves the play state alone. Implemented as the pure `planMarkerJump` plus `jumpToMarker` on the controller (new `marker-jump-*` files beside the runtime commands). The seek is used when the loaded item has the same owner and contains the marker; otherwise the originating item is loaded.
  - Found and fixed in passing: `createAdjustedTrackSource` copied `markers` onto adjusted copies; it now leaves them on the owner (spec added).

## 4. Markers sheet

- [x] 4.1 Build the `MarkersSheet` model (rows, filter, subtitle `Markers for <track name>`, empty state, past-end rows, `Select` mode with exactly-two rule, row action sets for explicit and derived rows) and spec it for every `track-markers` scenario.
- [x] 4.2 Build the sheet view: list with time and name, filter control, `Add marker here` (loaded only), `Select`, `Create loops from markers`, the row menu, `Rename` dialog, `Move` dialog (±0.1 s, ±1 s, `Set to current position`, `mm:ss.s` entry with validation), delete with undo toast. Nocturne tokens, 44 pt rows, sentence-case copy, accessible labels. Done: `Select` uses the shared `SelectEntryButton` beside the filter (decided with the user), and `selection-surfaces-guard.spec.ts` lists the sheet as a standalone entry surface that needs no selection bar or pinned bulk bar. The `Rename` confirmation after an add and the undo are one inline notice bar inside the sheet, since a toast would sit behind the modal.
- [x] 4.3 Add `Markers` to the shared saved-item menu (after `Sheet music`) for tracks, loops, and adjusted tracks with an icon in `menu-action-icons.ts`; extend the icon spec and saved-item menu specs; confirm playlist, folder, and bulk menus do not gain it. Host the sheet like the lyrics and sheet music hosts. Done: the host is `markers/components/markers-host.tsx` (mounted in the app router next to the lyrics and sheet music hosts), the entry rides the saved-item request channel (`markers` action) with `Markers` / `flag-outline` (new `Flag` glyph), and a loop whose track is gone is offered no `Markers`. Playlist, folder and bulk menus are unchanged. Loop-making entries (`Loop to next marker`, `Select`, `Create loops from markers`) are gated by `canMakeLoops`, which the host sets to false until 6.3 and 6.4. Verified in the browser preview with seeded markers: list, order, past-end row, move, delete with undo. Add and jump need a live Drive session and are covered by 7.1.
- [x] 4.4 Add `Markers` and `Add marker here` to the playback screen overflow (`now-playing-menu-model`), extend its spec. Done: `Markers` arrives through the shared shortcuts; `Add marker here` is a new `add-marker-here` request (optional `positionMs` for the 5.2 long-press) handled by `MarkerAddHost`, which adds at the playhead and confirms with a floating toast offering `Rename` (no layout space). Toast placement above the transport (112 pt from the bottom) is unverified until 7.1 has a live session.

## 5. Waveform flags

- [ ] 5.1 Add a flag layout model (positions to x, merge below 12 pt, kinds, nearest-flag hit test) and spec it, including crowded flags and the filter.
- [ ] 5.2 Draw the flags on the playback waveform component with the press label, tap-to-jump, long-press-to-add, and long-press-on-flag menu, with button roles and labels for assistive technology. Confirm no layout shift.

## 6. Loop editor and markers to loops

- [ ] 6.1 Extend the loop editor model with the armed field state and `pickMarker(field, marker)` (does not move the other boundary; invalid range handled by the existing validation), excluding the edited loop's own derived markers. Spec arming, disarming, pick start, pick end, and the invalid range.
- [ ] 6.2 Make the Start/End range cards selectable with the armed outline, add `Pick marker` opening the list as a picker (filter retained), draw read-only flags on the loop editor waveform, and make flag taps set the armed field. Markers cannot be added there.
- [ ] 6.3 Add `Loop to next marker` and two-marker `Make loop` by opening the loop editor in create mode with prefilled boundaries and name; spec the prefill (including last-marker, unknown duration).
- [ ] 6.4 Build the `Create loops from markers` dialog (sections with checkboxes, `Include intro`, skipped reasons, `Create N loops`) over `planMarkerSections` and the existing save-loop operation. Spec the dialog model, including nothing checked disabling confirm.

## 7. Verification and docs

- [ ] 7.1 Verify in the browser preview with playback muted: add at the playhead and by long-press, rename, move, delete and undo, jump playing, paused, and from the library, loop markers appearing, updating, disappearing, the filter, keep-as-marker, flags on both waveforms, picking in the loop editor, the three markers-to-loops flows, a loop's and an adjusted copy's lists, and persistence across reload. Record the result here.
- [ ] 7.2 Confirm markers appear nowhere else (Files tree, search, tags, playlists, bulk) and that removing a track removes them.
- [ ] 7.3 Update the README with the new capability and run `npm exec -- nx run-many -t lint test typecheck build --all` (or affected) green.

## 8. Follow-ups found during implementation (not part of this change's scope)

- [ ] 8.1 `packages/audio-library-runtime/src/lib/async-storage-practice-repository.ts` was already over the 300-line guideline (330) and is now 350 with the marker methods, so `max-lines` warns. Split the repository's per-feature methods (lyrics, sheet music, markers) into delegating helpers or a mixin so the class file is back under 300 lines. Pre-existing warning, not CI-blocking.
