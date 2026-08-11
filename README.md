<img src="brand/logo-512.png" width="96" alt="Herald">

# Herald

Show what you're watching or listening to in your browser as a Discord Rich Presence — for free.

Netflix, YouTube, Prime Video, Spotify, Twitch and more. Nothing leaves your computer.

## How it works

A browser extension cannot talk to Discord directly: Discord's Rich Presence runs over a
local named pipe that browsers are not allowed to touch. Herald is therefore two pieces.

```
[ Browser extension ] --ws://127.0.0.1:6970--> [ Companion app ] --IPC--> [ Discord ]
    reads metadata                              runs in your tray
```

The extension reads the title, episode, artwork and playback position from the page.
The companion app receives that over a local WebSocket and writes it to Discord.
No server is involved at any point.

## Install

1. Install the extension from the Chrome Web Store *(coming soon — until then, load it
   unpacked: `chrome://extensions` → Developer mode → Load unpacked → pick `extension/`)*
2. Download the companion app from [Releases](https://github.com/Tahakck35/herald/releases),
   unzip it anywhere and run `Herald.exe`
3. In Discord: **Settings → Activity Privacy → Display current activity as a status message**
   must be on

The companion app lives in your tray. Right-click it to pause, enable start-with-Windows,
or quit.

## Supported sites

| Site | Title | Episode / artist | Artwork | Progress |
|---|---|---|---|---|
| YouTube | yes | channel | yes | yes |
| YouTube Music | yes | artist | yes | yes |
| Netflix | yes | season & episode | yes | yes |
| Prime Video | yes | season & episode | series poster | yes |
| Max | yes | yes | yes | yes |
| Disney+ | yes | yes | yes | yes |
| Spotify Web | yes | artist | yes | yes |
| Twitch | yes | channel & category | channel avatar | uptime |

Turn individual sites on or off from the extension popup. "Hide details" shows only the
site name, in case you'd rather not broadcast what you're watching.

## Privacy

Herald has no backend. The extension holds no host permissions beyond the sites listed
above, sends nothing to any remote server, and stores your settings in your own browser
profile. The companion app only listens on `127.0.0.1` and only talks to the Discord
client already running on your machine.

Herald reads metadata that the page has already rendered. It does not touch, capture or
record DRM-protected video or audio.

See [PRIVACY.md](PRIVACY.md).

## Building from source

```bash
# Companion app (Windows)
cd companion
npm install
npm run build        # produces dist/Herald.exe + dist/traybin

# Development, with a console window
npm start
```

The extension needs no build step — load the `extension/` folder unpacked.

## Adding a site

Adapters are small, self-contained files. Writing one is the easiest way to contribute:
see [docs/adapters.md](docs/adapters.md).

## License

MIT — see [LICENSE](LICENSE).

Herald is not affiliated with Discord, Netflix, Amazon, Google, Spotify, Twitch,
Warner Bros. Discovery or The Walt Disney Company. All trademarks belong to their owners.
