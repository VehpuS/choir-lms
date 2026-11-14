## Why

Reported on an iPhone 17 Pro (home-screen web app) with Bluetooth earbuds: with pitch detection listening, playback is degraded (muffled, glitchy). The screen recording of it sounded clean.

The likely cause is the earbuds' two modes. The high-quality stereo mode (A2DP) is output-only; once the page also captures from the earbuds' microphone, iOS moves the whole connection to the hands-free mode (HFP): mono, narrowband. The change happens at the route and codec stage, after the page's audio and before the ears, which is why a screen recording (which takes the page's own audio) does not hear it and why the browser scenarios, which read the Web Audio output, cannot see it.

The page takes whichever input the system picks, and a person cannot choose another. Choosing the phone's own microphone may let the earbuds stay in the stereo mode (best effort: the page cannot set the platform's Bluetooth option itself). Choosing the input is useful regardless: a singer may want an external or headset microphone, or the built-in one.

## What Changes

- The web microphone source opens the input the person chose (`deviceId`), not only the system's default. A remembered input that is no longer connected falls back to the system's choice without an error, and is kept.
- When the microphone is about to open, more than one input exists and no choice is remembered, a prompt asks which to use. It looks and behaves like the bulk-selection prompt: the options, a "Remember my choice" checkbox, and Continue. Closing it uses the system's choice this once and remembers nothing.
- A Microphone category in Settings shows the remembered choice and changes it: Ask each time, Automatic (the system's choice), or one of the inputs. It lists the inputs that are connected now and keeps a remembered one that is not, marked as not connected. The choice is per device and applies to pitch detection and recording alike (they share one microphone).
- Browsers hide input names until a microphone has been granted, so the first start with no choice opens the system's input to get the grant and the names, closes it, then asks. Once names are known (or the grant exists) the prompt comes first and the chosen input is the only one opened.
- Web only. Native has no microphone capture yet; the category is hidden there.

Not included: setting iOS's own Bluetooth output option from the web (the platform does not offer it); switching the input while the microphone is already open (change it, then stop and start).

## Capabilities

### New Capabilities

- `microphone-choice`: choosing, remembering and changing the microphone input.

## Impact

`packages/mobile-rehearsal-player/src/app/library/pitch/` (the web source, a new `microphone-choice/` folder), `library/selection/bulk-choices-prompt/` (the remember row is shared), `screens/settings/` (a Microphone category), `App` (a host for the prompt), `tools/browser-session/` (a scenario). The fix for the Bluetooth quality cannot be verified in CI; the maintainer's device check in `tasks.md` closes that.
