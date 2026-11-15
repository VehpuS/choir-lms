## 0. Findings and exploration (done)

- [x] 0.1 Record the symptom, what was tried and the hypotheses (`design.md`, Context)
- [x] 0.2 Read how Safari sets the iOS audio session while capturing (WebKit source) and how native audio projects keep Bluetooth output clear while recording (`design.md`, Findings 1 to 3); native findings copied to `native-playback-follow-ups` 1.12 and 1.13
- [x] 0.3 Record the browser DAW result and how this app differs from one (`design.md`, Findings 4)

## 1. On the device, no code

- [x] 1.1 Maintainer: the Soundtrap test (2026-11-15): same earbuds, browser tab; mono material, so stereo not judged; which microphone it recorded from not checked. Superseded as evidence by 1.2(a). The iOS version and the earbuds' model are still to be noted
- [ ] 1.2 Maintainer, deployed web app, earbuds, pitch detection on:
  - [x] (a) a composite track: clear, including with its pitch changed (2026-11-15)
  - [x] (b) a single track after a pitch shift and back to 0: still thin with pitch detection on, clear without it (2026-11-15). Routing the element through a context is ruled out
- [x] 1.3 Record the results in `design.md` (Findings 5) and narrow the hypotheses to the media element

## 2. Choose the fix

- [ ] 2.1 Checkpoint with the maintainer on design Decision 2 (single tracks through the Web Audio engine while a microphone is open) and its open questions: stereo, recording, where it applies. Then write it as its own change (proposal, design, specs, tasks) and point this change's group 3 at it
- [ ] 2.2 Look up WebKit bug 311451 and add the finding (a playing media element degrades Bluetooth output while a microphone is open, even when routed through Web Audio; Web Audio playback does not), or file a new bug

## 3. In this change

- [ ] 3.1 Notice where the microphone is turned on in iPhone and iPad browsers (design Decision 4), with a browser scenario; narrowed or removed when the fix ships
- [ ] 3.2 Remove "Sound while listening": `audio-route-store`, the Settings control, the `AudioRoute` branches of the arbiter, their specs and the `microphone-audio-route` scenario; the arbiter keeps `playback` for the piano and `play-and-record` while capturing
- [ ] 3.3 Update `docs/mobile-cross-platform-audio-playback.md`: a playing media element and an open microphone do not go together on iPhone Bluetooth output, and what the app does about it

## 4. Verify

- [ ] 4.1 Maintainer's iPhone with Bluetooth earbuds, home-screen web app: a queue (including a wide stereo track) with pitch detection on stays clear across songs, pause and resume, and keeps playing in the background as it does today; the piano is still audible with the silent switch on; pitch detection still hears
- [ ] 4.2 Same setup: recording over a playing track stays clear and the take is aligned to the track
- [ ] 4.3 Chrome on a Mac: playback, pitch detection and recording unchanged

## Follow-ups

- [ ] F1 Composite playback stopped when the app went to the background (maintainer's iPhone, home-screen web app, Bluetooth earbuds, pitch detection on, 2026-11-15, seen during 1.2(a)). Not known yet whether it also stops with pitch detection off, or whether it is expected (the composite engine plays through Web Audio with no media element). Check against `composite-tracks` and `docs/mobile-cross-platform-audio-playback.md`; it matters here because fix (b) would inherit it
