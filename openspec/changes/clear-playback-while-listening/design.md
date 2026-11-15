## Context

### Environment of the reports

- iPhone 17 Pro, the app added to the home screen (the web app as a standalone app, not a Safari tab). The iOS version and the earbuds' model were not recorded.
- Chrome on a Mac was not reported as affected; the maintainer tests on Chrome (Mac) and the iPhone only.
- Unreproducible in CI: Chromium has no Bluetooth route and no iOS audio session. The browser scenarios check what the page asks for, never what iOS does.

### Symptom

1. A track (or queue) plays through Bluetooth earbuds with a microphone open (pitch detection on, or recording).
2. Playback starts clear, and after about one to two seconds changes, suddenly, to a thin, low-quality sound.
3. The next song in a queue starts clear again and degrades again after the same delay. Pausing and resuming does the same.
4. It happens with no sound made into the microphone.
5. It does not happen with the iPhone's speaker, and not with a track or the piano alone.
6. A screen recording made while it happened sounded normal.

### Tried in the web app (all on the maintainer's iPhone, none avoided it)

| Idea                                                                     | Release                       | Result                                                                 |
| ------------------------------------------------------------------------ | ----------------------------- | ---------------------------------------------------------------------- |
| The browser's own session (`auto`)                                       | before the audio-session work | already degraded                                                       |
| `playback` session while the piano is open                               | piano first-sound fix         | broke the microphone ("No microphone found")                           |
| `play-and-record` while a microphone is open                             | `piano-first-sound-on-launch` | microphone works; degradation still there                              |
| Choose the iPhone's own microphone (`deviceId` as an `ideal` constraint) | `microphone-choice`           | degradation still there; which input really opened was never read back |
| "Sound while listening" = Automatic                                      | `microphone-choice`           | no difference                                                          |
| "Sound while listening" = Playback once the microphone is on             | `microphone-choice`           | no help; whether the microphone kept hearing was not reported          |

## Findings from the exploration (2026-11-15)

### 1. What Safari does when a page captures (WebKit source, `main`, read 2026-11-15)

`Source/WebCore/platform/audio/cocoa/MediaSessionManagerCocoa.mm`, `updateSessionState()`:

- If the page set an audio session type, that becomes the category. Otherwise, with any active audio capture, the category is play-and-record with mode `VideoChat`.
- After that, **any** play-and-record category with the default mode is changed to `VideoChat`. So `navigator.audioSession.type = 'play-and-record'` and `'auto'` end in the same place while capturing.
- `Source/WebCore/Modules/audiosession/DOMAudioSession.cpp` maps the page's type to a category only (`playback` to media playback, `play-and-record` to play-and-record). There is no way to pass a mode or an option.

`Source/WebCore/platform/audio/ios/AudioSessionIOS.mm`, `setCategory()`, for play-and-record:

```objc
options |= AVAudioSessionCategoryOptionAllowBluetooth
         | AVAudioSessionCategoryOptionAllowBluetoothA2DP
         | AVAudioSessionCategoryOptionAllowAirPlay;
// plus AVAudioSessionCategoryOptionDefaultToSpeaker unless the receiver is preferred
```

`AllowBluetooth` is the hands-free (HFP) option. It is always set, with a FIXME only about its deprecated name. Every other category gets no options. `Source/WebCore/platform/mediastream/ios/AVAudioSessionCaptureDeviceManager.mm` turns a chosen `deviceId` into `setPreferredInput:` on the shared session.

What this explains:

- **Why the settings did nothing.** `auto` and `play-and-record` produce the same session (play-and-record, video chat, HFP allowed). `playback` has no input at all. The page has no fourth choice.
- **Why Bluetooth only.** With HFP allowed and an input open, iOS routes a headset through the hands-free profile, which carries input and output together as mono narrowband audio. The speaker has no such profile. A screen recording taps the audio before the route.
- **Not explained by the source:** the one to two clear seconds after each start. The likely reason is that the session or route is re-applied when an element starts and the hands-free link takes that long to come up, with A2DP carrying the sound meanwhile. This is a guess. It does not change the solution.

A search result describes an open WebKit bug (311451: output degraded and mono after `getUserMedia` on iOS, `echoCancellation: false` not helping, still present in iOS 26.4). The bug tracker was not reachable from the exploration session, so this is unverified; task 1.5 checks it and adds this case to it.

### 2. What native apps do

- **AudioKit Cookbook** (`Cookbook/Cookbook/CookbookApp.swift`), the reference app of the most used open-source iOS audio framework, records and plays at once with:

  ```swift
  try AVAudioSession.sharedInstance().setCategory(.playAndRecord,
      options: [.defaultToSpeaker, .mixWithOthers, .allowBluetoothA2DP])
  ```

  A2DP is allowed and HFP is not. A2DP is output only, so the input stays on the phone's microphone (or a wired or USB one) and Bluetooth output stays on the stereo profile. This is the pattern behind "DAWs can play while recording".

- **Developer reports** (Apple forums, a Zenn write-up) agree on the detail that matters: with both Bluetooth options set, the hands-free microphone wins; dropping the HFP option and keeping A2DP gives phone microphone in, earbuds out. Some reports of the output falling back to the speaker involve calling `setPreferredInput` with both options set, which is the combination Safari uses. The proposed session does not need `setPreferredInput` at all.
- **iOS 26** adds `bluetoothHighQualityRecording` (AirPods microphone at high quality). It is for recording from the earbuds, is not available everywhere, and one project reports playback problems with it (livekit/client-sdk-react-native issue 467). Not needed here: the phone's microphone is closer to what pitch detection wants.
- **Latency.** GarageBand users report that Bluetooth output is late enough to matter when monitoring. A2DP output is typically 150 to 300 ms behind. The native session reports its output latency, which the app can use (Decision 5).

### 3. Libraries that fit this repo

- **`react-native-track-player` 4.1.2** (already the native player): `setupPlayer` and `updateOptions` take `iosCategory`, `iosCategoryMode` and `iosCategoryOptions`, and `IOSCategoryOptions` has `AllowBluetoothA2DP` (`src/interfaces/PlayerOptions.ts`, `src/constants/IOSCategoryOptions.ts`). The app calls `setupPlayer()` with no options today, so the session is the default playback one.
- **`react-native-audio-api`** (Software Mansion, MIT; 1.1.0 on `main`), already named in `native-playback-follow-ups` 1.1(a), 1.7 and 1.12:
  - `AudioManager.setSystemOptions({ ios: { category: 'playAndRecord', mode: 'default', options: ['allowBluetoothA2DP', 'defaultToSpeaker'] } })`; the native layer accepts `allowBluetoothA2DP` and `allowBluetoothHFP` as separate options.
  - `AudioManager.getDevicesInfo()` gives the current and available inputs and outputs (name and port type), and `setInputDevice(id)` selects an input.
  - `AudioRecorder.onAudioReady({ sampleRate, bufferLength }, callback)` delivers PCM buffers; voice processing (`iosVoiceProcessing`) is off by default, which is what pitch detection needs.
  - `disableSessionManagement` hands the session to the app; the native side also exposes output and input latency.
  - It has an Expo config plugin and needs a development build. Its fit with Expo 54 / RN 0.81 is unconfirmed (task 1.1).

## Goals / Non-Goals

**Goals**

- On the maintainer's iPhone with Bluetooth earbuds, a queue plays clear, in stereo, for its whole length while pitch detection listens.
- Prove that on the device before building the feature.
- The web app is honest where it cannot do it.

**Non-Goals**

- Native recording, the recording overlay, piano, sheet music and composite tracks on iOS (`native-playback-follow-ups` 1.6, 1.7, 1.13, 1.14).
- Android. Its Bluetooth handling differs (the SCO link is asked for explicitly), and nothing has been reported there.
- Recording from the earbuds' microphone.

## Decisions

### Decision 1: The fix is native; the web app cannot have one

The session mode and Bluetooth options are fixed inside WebKit (Findings 1). A wrapper around the web app (a WKWebView or Capacitor shell) captures through the same WebKit code and gets the same session, so it does not help either.

Alternatives considered:

- _More web experiments with the session type._ Rejected: the source shows the outcomes are the same.
- _Wait for a WebKit fix._ No sign of one; nothing the repo can do but report it (task 1.5).
- _A native shell that captures the microphone itself and feeds PCM to the web app in a web view._ It would keep the web app's tools, but two audio sessions in two processes (the shell's recording one and WebKit's playback one) interrupt each other unless both mix, and that interplay is unverified. Kept as a fallback to probe only if feature parity turns out to matter more than a native pitch path (Open questions).

### Decision 2: Session while listening is play-and-record, default mode, A2DP only

`category: playAndRecord`, `mode: default`, `options: [allowBluetoothA2DP, defaultToSpeaker]`. Never the HFP option, never a chat mode, no voice processing.

- `defaultToSpeaker` because play-and-record without it sends sound to the earpiece when no headphones are connected.
- `allowAirPlay` is added if the probe shows AirPlay output is otherwise lost.
- `measurement` mode (no input processing at all) is tried in the probe; it is used only if it changes nothing about the output.
- No `mixWithOthers`: the app keeps lock-screen controls, which a mixing session loses.

Consequence, to be stated in the app: with Bluetooth earbuds the microphone is always the phone's (or a wired or USB one). The earbuds' microphone is not offered on iOS native.

### Decision 3: One owner of the session; play-and-record only while a microphone is open

Both libraries can set the session, and two owners would undo each other's settings. A native session owner (`components/audio-session/`, a native sibling of the web arbiter with the same `holdCapture` shape) is the only code that picks the session:

- nothing capturing: the playback category, as today;
- a capture hold: the Decision 2 session.

It applies the choice through the track player's options and tells `react-native-audio-api` to leave the session alone (`disableSessionManagement`), or the other way round; the probe picks whichever does not glitch (task 1.3). Play-and-record is not kept on all the time because it changes speaker loudness and routing for people who never use the microphone.

Open point for the probe: whether changing the category during playback is audible (a short gap is acceptable when the person has just pressed `Listen`; a stall is not).

### Decision 4: Probe first, as a debug screen in the development build

Nothing about Decisions 2 and 3 has been heard on the device. The probe is a screen reachable only in development builds: play a bundled or saved track through the track player, toggle a recorder, switch between session variants (A2DP only; A2DP and HFP, to reproduce the web behavior; `measurement` mode), and show the input level, `getDevicesInfo()` current input and output, and the reported output latency. Pass means: Bluetooth output stays stereo and clear for a full queue, across pause and resume, with the level meter moving from the phone's microphone.

If the probe fails, the change stops at the web notice (Decision 6) and this document records what was heard.

### Decision 5: Native `PcmSource` on iOS, reusing everything above the seam

`pcm-source.ios.ts` implements the existing `PcmSource` contract through `createSharedPcmSource` (several subscribers, one stream), with `AudioRecorder.onAudioReady` as the block source and the frame assembler unchanged. `pitchCapabilities().canListen` becomes true on iOS. Permission is asked on the first `Listen`, as on web. Capture runs only while the app is visible.

Bluetooth output is late, so a sung note is compared against a track position the singer heard some 200 ms earlier. Where the pitch store pairs a sung note with a track position (score marks need the native sheet music viewer, which does not exist yet), the session's output latency is the correction. In this change the latency is read and exposed by the session owner; using it is a task only where a native surface compares against track time.

### Decision 6: The web app says it, where the microphone is turned on

On iOS Safari (any iPhone or iPad browser, since all use WebKit's capture), the microphone prompt and Settings > Microphone show a short notice: Bluetooth earbuds sound thin while the app listens; the speaker or wired earphones sound right. The web cannot see the output route, so the notice is shown on iOS whenever the microphone is offered, not only when earbuds are connected. An input list with a Bluetooth-labelled entry is used to make it prominent rather than quiet. Once the iOS app can listen, the notice names it.

The "Sound while listening" setting, `audio-route-store` and the `AudioRoute` branches in the arbiter are removed. The arbiter keeps its two real jobs (`playback` for the piano, `play-and-record` while capturing).

One web check is still worth a device pass because it costs a line of UI: show the label of the input that actually opened (`track.label`) in Settings > Microphone. If the iPhone's microphone really was open during the earlier test, the web side is closed for good. If the earbuds' microphone was open despite the choice, `deviceId: { exact }` is tried once; a clear result there would be a web fix for people who choose the iPhone microphone, and the notice would say so. The source suggests this will not help (HFP stays allowed and Safari then calls `setPreferredInput`, the combination with speaker-fallback reports), so it is a check, not a plan.

## Risks / Trade-offs

- **The probe may fail on this phone or these earbuds.** Then the change is the web notice only. Mitigation: the probe is small and comes first.
- **The native app is behind the web app.** Clear pitch detection on iOS without the piano, the score or recording may not be the rehearsal the maintainer wants. Mitigation: decided explicitly after the probe (Open questions); the probe result also tells whether `native-playback-follow-ups` 1.13 (native recording) is worth scheduling.
- **A new native dependency** next to the track player, both touching the session. Mitigation: Decision 3, and the probe exercises exactly that pairing.
- **Phone microphone hears less of a singer wearing earbuds than the earbuds' own microphone would.** The `Minimum volume` default was tuned in a browser; checked on the device (task 2.6).
- **Category change while playing may glitch.** Probe item; fallback is play-and-record from player setup whenever pitch detection is enabled in Settings.
- **Distribution.** A development build expires after seven days with a free Apple ID; other singers need TestFlight, which needs a paid developer account.

## Open Questions

1. After a passing probe: is pitch detection alone on iOS native worth shipping, or does it need native recording (and which other tools) before the maintainer would rehearse in the iOS app instead of the web app?
2. Is there an Apple developer account for TestFlight, or is this for the maintainer's phone only for now?
3. The iOS version and earbuds' model of the original report (task 1.4).
