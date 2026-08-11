# Privacy Policy

Last updated: August 2026

Herald does not collect, transmit or store any personal data on remote servers.
There is no backend, no analytics, and no telemetry.

## What the extension reads

On the supported streaming sites only, Herald reads information the page has already
rendered: the title, episode or artist, artwork URL, playback position, duration, and
whether playback is running or paused.

## Where that information goes

It is sent over a WebSocket connection to `127.0.0.1:6970` — an address that never leaves
your computer — where the Herald companion app passes it to the Discord desktop client
already running on your machine. Discord then displays it according to your own Discord
activity privacy settings.

Nothing is written to disk by the extension except your own settings (which sites are
enabled, whether details are hidden), stored in your browser profile.

## What Herald never does

- Contact any server operated by the author or a third party
- Record, capture or copy video or audio, including DRM-protected content
- Read pages other than the supported streaming sites
- Track browsing history

## Your control

Disable any site, or turn Herald off entirely, from the extension popup. Quit the
companion app from its tray icon to stop broadcasting immediately. Uninstalling the
extension removes its stored settings.

## Contact

Open an issue at https://github.com/Tahakck35/herald/issues
