## 0. Findings (done)

- [x] 0.1 Record the symptom and what was tried in the web app (`design.md`, Context)
- [x] 0.2 Read how Safari sets the iOS audio session while capturing; native session findings copied to `native-playback-follow-ups` 1.12(g) and 1.13
- [x] 0.3 Device checks (maintainer, 2026-11-15): composite clear; single track thin, also when routed through an audio context; clear without pitch detection; Soundtrap clear in a browser tab on the same earbuds (`design.md`, Findings 3 and 4)
- [x] 0.4 Design the fix in two stages (`design.md`, Decisions 1 to 7)

## 1. Before building

- [x] 1.1 Maintainer (2026-11-15, screen recording): a composite with pitch detection off stops within about a second of the app going to the background and resumes from there on return. The engine does not play in the background; the hand-back in design Decision 4 stands (Decision 5)
- [x] 1.2 Remove "Sound while listening": `audio-route-store`, the Settings control, the `AudioRoute` branches of the arbiter, their specs and the `microphone-audio-route` scenario; the arbiter keeps `playback` for the piano and `play-and-record` while capturing

## 2. Stage 1: pitch detection

- [x] 2.1 The active-engine registry records what the engine plays (`setActiveCompositeEngine(engine, kind)`, `getActiveEngineKind`, `useIsCompositePlaying`); `use-practice-tools.ts` hides `Recording` for a composite only. The Mix panel, stem options and the composite waveform are already keyed by composite id and render nothing for a track id (spec added for the Mix panel). Specs for the registry, the hook and the panel
- [ ] 2.2 Prepared audio for single tracks: the reserved owner id and stem id, the content version check, listing by group (`Prepared composites`, `Prepared for listening`), the 500 MB budget with least-recently-played eviction that never removes the playing track, and the room check. Pure model with specs; the offline files view shows the new group with `Clear all`, with a browser scenario
- [ ] 2.3 Single-track engine loader in `library/playback/listening-engine/`: fetch through `fetchTrackBlob`, prepare through `createStemLoader`, build a one-stem engine with `createWebCompositeEngine`, publish preparing progress. Specs with the composite test fakes
- [ ] 2.4 The rule and the load branch: a store of "a microphone is open" fed by the capture holds, and `loadIntoPlayer` loading a single track onto the engine while it is true (volume, start position, shaping, loop, autoplay), with the `Preparing for listening · first time only` state. Specs for the branch; browser scenario: with listening on, a track plays with no media element playing, and seek, loop, speed, pitch, next and previous behave as before
- [ ] 2.5 Hand-over module (`listening-engine/handover.ts`): element to engine when a microphone opens (prepare while the element plays, switch at its position), engine to element when the last one closes, same playing or paused state, loop and shaping applied before the incoming side starts, a failed switch leaves the current side playing and reports once. Specs for each direction, paused and playing, and failure; browser scenarios for `Listen` on and off during a track, checking the position continues within the allowed gap
- [ ] 2.6 Prepare ahead: the next queue item is prepared while the current one plays with a microphone open; cancelled when the queue changes. Specs; scenario: the second track of a queue starts without a preparing wait
- [ ] 2.7 Fallbacks: no room, offline with no stored copy, or a decode failure keep the track on the media element with one message that the sound may be thin on Bluetooth while the app listens. Specs and a scenario for no room
- [ ] 2.8 Hidden app: when the app is hidden with a track on the engine, the track is handed back to the media element and keeps playing; media session and lock-screen controls work after it. Scenario for the page-hidden path; **maintainer, on the phone:** lock the screen during a track with listening on, and say whether playback continues without a gap longer than a moment
- [ ] 2.9 Update `docs/mobile-cross-platform-audio-playback.md` (the two strategies, the rule, the hand-over, prepared listening audio) and the README if the development focus changes
- [ ] 2.10 **Maintainer, stage 1 on the phone with the earbuds, home-screen web app:** a queue with pitch detection on stays clear across songs, pause and resume, loops, and a speed and pitch change; turning `Listen` on and off mid-song does not restart or jump; the piano is still audible with the silent switch on; background playback without listening is as before. Chrome on a Mac: the same flows work

## 3. Stage 2: recording

- [ ] 3.1 The engine reports its position for a given context time, and play, pause, seek and loop-wrap events through its subscription. Specs on the engine with the fake context
- [ ] 3.2 Engine transport for recording (`recording-transport.web.ts`): `getRecordingTransport()` returns it when an engine is active for a single track, the media element transport otherwise. Specs for both and for the selection
- [ ] 3.3 Start of a take: open the microphone, hand the track to the engine (preparing if needed, with the countdown held), then start; no hand-over during a take; the end of a take follows the stage 1 rule. Specs for the ordering; scenario: a take over the generated track with the fake microphone aligns within the existing tolerance, with no media element playing during it
- [ ] 3.4 Clock anchors against the engine: capture times and engine positions paired on `performance.now()` through the contexts' output timestamps; the anchor-fit specs run against an engine transport with a drifting fake clock
- [ ] 3.5 Punch and the overlay voice against the engine transport: specs for the sync controller with it; scenario for a punch over a track
- [ ] 3.6 Output latency: read the context's reported output latency as the starting value where the browser gives one; nudge, `Use for this device` and click calibration unchanged. Specs for the starting value
- [ ] 3.7 Update the playback doc's recording section
- [ ] 3.8 **Maintainer, stage 2 on the phone with the earbuds:** a take over a track is clear while recording, the take is aligned after click calibration, a punch works, a call or locking the phone stops the take as before. Chrome on a Mac: recording, punch and export unchanged

## 4. Verify the change

- [ ] 4.1 `npm exec -- nx run-many -t lint test typecheck build --all` and `browser-test`, with the new scenarios run several times
- [ ] 4.2 The spec's scenarios checked off against stage 1 and stage 2 device passes

## 5. Report

- [x] 5.1 iOS 26.6.2, Soundcore P40i earbuds (maintainer, 2026-11-15; `design.md`, Context)
- [ ] 5.2 Look up WebKit bug 311451 and add the finding (a playing media element degrades Bluetooth output while a microphone is open, also when routed through Web Audio; Web Audio playback does not), or file a new bug

## Follow-ups

- [ ] F1 Composites do not play in the background (confirmed with pitch detection off, task 1.1): it is how Web Audio playback behaves on the phone with no media element playing. Decide separately whether composites should get background playback, and how
- [ ] F2 Stereo while a microphone is open: a stereo prepared format and voice for single tracks (deferred by the maintainer 2026-11-15; mono first)
- [ ] F3 A track prepared for a composite and for listening is stored twice; share the prepared audio between the two owners
- [x] F4 Browser scenarios `restore-import` and `share-and-access` fail on any machine outside UTC (seen 2026-11-15 on an IST Mac, full default lane; they pass with `TZ=UTC`). The app formats bundle dates in the device's time zone (`bundle-flow-model.ts`, `formatBundleDate`) while the scenarios expect `1 Nov 2026, 10:00`. Done: `mock-library-session.ts` pins `timezoneId` to UTC. CI runs in UTC, so it does not block CI; it blocks local runs
- [x] F5 Browser scenario `piano-samples-preload` is flaky under the full lane (seen 2026-11-15: `42 !== 21` recording requests in the default lane; it passed twice alone). Main's last commit (`7d771cd7`) targeted the same scenario; Done (2026-11-15): requests are now counted per committed document, since the old page's warm-up could land in the gap before the reload commits (the likely cause; not reproduced in 10 parallel runs under CPU load). The failure message now shows distinct and total counts if it recurs; two full lane runs passed 79/79
- [ ] F6 The stored `choirlms.audio.route-while-listening` key from the removed setting is no longer read or cleared and stays on devices that set it. Remove it once at startup, or leave it on purpose and say so (low priority)
- [ ] F7 **Explore with the maintainer before changing anything (UX):** Settings > Microphone still says "the phone's own microphone may avoid that" (the thin-sound hint), while task 1.2 removed the matching README sentence as out of date. Decide whether the in-app copy should say the same as the README's known-limit note, or point to the planned fix. Seen in the browser pane on this branch; if it is not part of this change, make it a follow-up change
- [ ] F8 Tooling notes, not blocking: `nx` reports "2 flaky tasks" on `lint typecheck test build` for `mobile-rehearsal-player`, and "AI agent configuration is outdated" (`nx configure-ai-agents`). Find which two tasks are flaky; decide on the config update separately. Also, a long-running dev server started before `npm ci` fails with "Failed to get the SHA-1" until restarted (restart it, nothing to fix)
