## 0. Findings and exploration (done)

- [x] 0.1 Record the symptom, what was tried and the hypotheses (`design.md`, Context)
- [x] 0.2 Read how Safari sets the iOS audio session while capturing (WebKit source) and how native audio projects keep Bluetooth output clear while recording (`design.md`, Findings 1 to 3); native findings copied to `native-playback-follow-ups` 1.12 and 1.13
- [x] 0.3 Record the browser DAW result and how this app differs from one (`design.md`, Findings 4)

## 1. On the device, no code

- [x] 1.1 Maintainer: the Soundtrap test (2026-11-15): same earbuds, browser tab; mono material, so stereo not judged; which microphone it recorded from not checked. Superseded as evidence by 1.2(a). The iOS version and the earbuds' model are still to be noted
- [ ] 1.2 Maintainer, deployed web app, earbuds, pitch detection on:
  - [x] (a) a composite track: clear, including with its pitch changed (2026-11-15)
  - [ ] (b) a single track: start it, shift its pitch by one semitone, set it back to 0, and keep listening across a pause, a resume and the next song in the queue. Note whether it stays clear, and whether the next song starts thin again
- [x] 1.3 Record the results in `design.md` (Findings 5) and narrow the hypotheses to the media element

## 2. Choose the fix

- [ ] 2.1 Checkpoint after 1.2(b): fix (a) (route the element through the playback context while a microphone is open) if it stayed clear; otherwise stop and propose fix (b) (single tracks through the Web Audio engine while a microphone is open) as its own change. Update `design.md` and group 3
- [ ] 2.2 Look up WebKit bug 311451 and add the finding (media element playback degrades on Bluetooth while capturing, Web Audio playback does not), or file a new bug

## 3. The fix (written for fix (a); rewritten at 2.1 if it is (b))

- [ ] 3.1 Build the element-to-context graph when a capture hold opens and for each element created while one is open (the pitch shifter's graph, dry path), with specs for the ordering (hold before element, element before hold, a new element mid-hold) and a browser scenario asserting the playing element is routed through the context while the microphone is open
- [ ] 3.2 Remove "Sound while listening": `audio-route-store`, the Settings control, the `AudioRoute` branches of the arbiter, their specs and the `microphone-audio-route` scenario; the arbiter keeps `playback` for the piano and `play-and-record` while capturing
- [ ] 3.3 Only if neither fix is acceptable: the notice where the microphone is turned on in iPhone and iPad browsers, with a browser scenario (design Decision 4)
- [ ] 3.4 Update `docs/mobile-cross-platform-audio-playback.md` with the playback arrangement while a microphone is open and why

## 4. Verify

- [ ] 4.1 Maintainer's iPhone with Bluetooth earbuds, home-screen web app: a queue (including a wide stereo track) with pitch detection on stays clear across songs, pause and resume, and keeps playing in the background as it does today; the piano is still audible with the silent switch on; pitch detection still hears
- [ ] 4.2 Same setup: recording over a playing track stays clear and the take is aligned to the track
- [ ] 4.3 Chrome on a Mac: playback, pitch detection and recording unchanged

## Follow-ups

- [ ] F1 Composite playback stopped when the app went to the background (maintainer's iPhone, home-screen web app, Bluetooth earbuds, pitch detection on, 2026-11-15, seen during 1.2(a)). Not known yet whether it also stops with pitch detection off, or whether it is expected (the composite engine plays through Web Audio with no media element). Check against `composite-tracks` and `docs/mobile-cross-platform-audio-playback.md`; it matters here because fix (b) would inherit it
