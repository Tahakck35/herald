# Architecture

## Why two pieces

Discord's Rich Presence API is local IPC — a named pipe on Windows
(`\\.\pipe\discord-ipc-0`), a Unix socket elsewhere. Browser extensions run in a sandbox
with no access to either. Discord does expose a local WebSocket RPC endpoint, but
`SET_ACTIVITY` over that transport requires an OAuth scope that is allowlisted per
application and not available on request.

So the extension collects, and a small local app delivers.

## The pieces

**`extension/main-world.js`** runs in the page's own JavaScript context (`world: "MAIN"`).
It reads `navigator.mediaSession` and site-specific globals, and posts them to the
isolated world once a second.

**`extension/shared.js`** receives those messages and exposes `HeraldMS` / `HeraldSite`,
plus small helpers.

**`extension/adapters/*.js`** each define `__HeraldAdapter` for one site.

**`extension/core.js`** polls the adapter, normalises the result, stamps `sampledAt`, and
messages the service worker.

**`extension/background.js`** keeps one WebSocket to the companion app, decides which tab
wins when several are playing, and applies user settings.

**`companion/index.js`** runs a WebSocket server on `127.0.0.1:6970`, speaks Discord IPC,
and throttles updates.

## Decisions worth remembering

**Tab arbitration is sticky.** A playing tab keeps the presence until it pauses or closes,
even if another tab starts. Without this, two open tabs made the presence flip constantly,
which burned through Discord's rate limit and froze the progress bar.

**Updates are throttled by importance.** A title or play/pause change waits at most 4
seconds; a seek that drifts the projected end time by more than 5 seconds waits 15. Normal
playback sends nothing at all — the end timestamp Discord already holds stays correct on
its own.

**Timestamps compensate for latency.** The extension stamps `sampledAt` when it reads
`currentTime`; the companion adds the elapsed time before computing Discord's start and
end. Otherwise the progress bar lands a few seconds behind and jumps backwards on every
refresh.

**One Discord application per site.** The activity name shown in a profile comes from the
application's name and cannot be set in the payload — the `name` field is ignored. Showing
"Netflix" rather than "Herald" therefore requires a separate application per site, each
holding its own art assets. `CLIENT_IDS` in `companion/index.js` maps them; sites left
blank fall back to the default.

**Bad images self-heal.** If Discord rejects an asset — a missing key, an unreachable URL,
one over 256 characters — the companion blacklists it and resends without it rather than
looping on the error.
