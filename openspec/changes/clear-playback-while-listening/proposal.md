## Status

**Proposed solution, not yet verified on a device (2026-11-15).** The first draft recorded findings only. This revision adds what the exploration found in WebKit's source and in native audio projects, and proposes a solution. Group 1 of `tasks.md` is a short device probe that confirms or refutes the proposal on the maintainer's iPhone before anything larger is built.

## Why

Reported on an iPhone 17 Pro, in the home-screen web app, with Bluetooth earbuds: **while a microphone is open (pitch detection or recording), playback sounds fine for a second or two after it starts and then turns into a thin, "cheap speaker" sound.** It happens on every new song in a queue and on every resume after a pause, even with nothing sung into the microphone. It does not happen with the iPhone's own speaker, and not with only a track or only the piano. A screen recording of it sounded clean.

The app's job is rehearsal: hearing the track clearly while singing against it. A singer on Bluetooth earbuds, which is most singers on a phone, gets a degraded rehearsal exactly when pitch detection or recording is on. DAWs and recording apps on the same phone do not have this problem, so the platform allows it.

## What Was Found

Details and sources are in `design.md`.

- **The cause is in how Safari sets up the iOS audio session, and a page cannot change it.** When a page captures a microphone, WebKit sets the session to play-and-record in the video chat mode and always allows the Bluetooth hands-free profile. That holds whatever `navigator.audioSession.type` the page asks for: the type picks the category only, never the mode or the Bluetooth options. With the hands-free profile allowed, iOS puts earbuds in call mode (mono, narrowband) while an input is open. This is why none of the "Sound while listening" settings did anything.
- **Native apps avoid it with one session option.** DAW-style apps use play-and-record with **only** the A2DP Bluetooth option (`allowBluetoothA2DP`) and without the hands-free option. A2DP has no microphone, so iOS records from the phone's own microphone and keeps the earbuds on the stereo profile. AudioKit's Cookbook app does exactly this.
- **The repo already has the seams for it.** `react-native-track-player` (native playback) takes the session category, mode and options at setup. `react-native-audio-api`, already the candidate in `native-playback-follow-ups` 1.12, exposes the same session options, input selection and a PCM recorder that fits the `PcmSource` seam. An iOS project exists (`packages/mobile-rehearsal-player/ios`).

## What Changes

1. **Device probe (first, small).** A debug screen in the iOS development build that plays a track with the proposed session and a live microphone level, and shows the current input and output route. It decides whether the rest is built. The same pass checks, in the web app, which microphone was really opened (the earlier test asked for the iPhone microphone with a soft constraint and never read back what it got).
2. **iOS app: pitch detection with a clear Bluetooth route.** A native microphone source behind the existing `PcmSource` seam, with one owner of the audio session that uses play-and-record with A2DP only while the microphone is open. This brings forward the iOS half of `native-playback-follow-ups` 1.12. Android and native recording stay there.
3. **Web app: say so, and stop pretending.** Where the microphone is turned on in Safari on iOS, the app says that Bluetooth earbuds sound thin while it listens, and what sounds better (the speaker, wired or USB-C earphones, or the iOS app once it exists). The "Sound while listening" setting is removed: the source shows its three options cannot differ in a useful way.

**Trade-off to decide (see `design.md`, Open questions):** the native iOS app is behind the web app (no piano, sheet music viewer, recording or composite tracks). This change makes pitch detection sound right on iOS; it does not bring the other tools to native. Installing the iOS build on the maintainer's and singers' phones also needs an Apple developer account or TestFlight.

## Capabilities

### New Capabilities

- `clear-playback-while-listening`: playback stays clear on Bluetooth earbuds while pitch detection is on in the iOS app, and the web app says plainly where it cannot.

### Modified Capabilities

- `pitch-detection`: on iOS native, listening becomes available (the delta is written in task 3.1 once the probe passes, so the spec does not promise what the device has not shown).

## Impact

- `packages/mobile-rehearsal-player`: a native `pcm-source` sibling, `pitch-capabilities`, the track player setup (`saved-track-player-runtime.ts`), a new native session owner under `components/audio-session/`, the debug probe screen, `app.config.ts` (microphone usage string, the `react-native-audio-api` plugin), a notice in the microphone prompt and Settings, and removal of `audio-route-store` and the `AudioRoute` branches of the arbiter.
- New dependency: `react-native-audio-api` (native code, so a new development build; lockfile in the same change).
- `native-playback-follow-ups` 1.12: the iOS half moves here once the probe passes.
- `tools/browser-session`: the `microphone-audio-route` scenario is replaced by one for the notice.
