// Herald companion — WebSocket sunucusu + Discord IPC kopru.
// Kurulum: npm init -y && npm i ws
// Calistir: node index.js

const net = require("net");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const { initTray } = require("./tray");
const autostart = require("./autostart");
const fs = require("fs");

// GUI modunda konsol olmadigi icin log'lar exe'nin yanindaki dosyaya da yazilir
const LOG_MAX_BYTES = 1024 * 1024;

const logFile = process.pkg
  ? path.join(path.dirname(process.execPath), "herald.log")
  : null;

function stamp() {
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, "0");
  const p3 = (n) => String(n).padStart(3, "0");

  return (
    `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ` +
    `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p3(d.getMilliseconds())}`
  );
}

function rotateIfNeeded() {
  try {
    if (fs.statSync(logFile).size < LOG_MAX_BYTES) return;
    fs.renameSync(logFile, `${logFile}.old`);
  } catch (e) {
    // dosya yok veya tasinamadi
  }
}

function initLogging() {
  if (!logFile) return;

  rotateIfNeeded();

  const write = (level, args) => {
    try {
      const line = args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
        .join(" ");
      fs.appendFileSync(logFile, `[${stamp()}] [${level}] ${line}\n`);
    } catch (e) {
      // log yazilamadi, onemli degil
    }
  };

  for (const [method, level] of [["log", "info"], ["warn", "warn"], ["error", "error"]]) {
    const original = console[method];

    console[method] = (...args) => {
      original(...args);
      write(level, args);
    };
  }

  write("info", [`--- Herald started (pid ${process.pid}) ---`]);
}

initLogging();

// baslangicta olusan hatalar da log'a dussun
process.on("uncaughtException", (e) => {
  console.error("Unexpected error:", e.stack || e.message);
});

process.on("unhandledRejection", (e) => {
  console.error("Unhandled rejection:", (e && e.stack) || String(e));
});

/* ---------------- Ayarlar ---------------- */

// Discord'da gorunecek isim = Application adi.
// Her site icin Developer Portal'da ayri Application ac, adini siteyle ayni koy,
// Application ID'sini buraya yaz. Bos birakilan site _default ile calisir.
const CLIENT_IDS = {
  "youtube": "1536704218243792997",
  "youtube-music": "1536705104831320164",
  "netflix": "1536552363832254574",
  "prime-video": "1536705231549767771",
  "max": "1536704828863025262",
  "disney-plus": "1536704742636650638",
  "spotify": "1536704567943897118",
  "twitch": "1536704404756107284",
  "_default": "1536515784422203392"
};

// Her Application'in kendi Art Assets'i vardir.
// Site logosunu ilgili Application'a yukleyip adini buraya yaz.
const SITE_IMAGES = {
  "youtube": "youtube",
  "youtube-music": "youtube-music",
  "netflix": "netflix",
  "prime-video": "prime",
  "max": "max",
  "disney-plus": "disney",
  "spotify": "spotify",
  "twitch": "twitch"
};

const PORT = 6970;
const MIN_GAP_MS = 5000;         // baslik / play-pause degisiminde minimum bekleme
const MINOR_GAP_MS = 15000;      // sadece seek kaymasi icin minimum bekleme
const DRIFT_TOLERANCE_MS = 5000; // bu kadar kayma olmadan yeniden gonderme
const IDLE_CLEAR_MS = 5000;      // uzantidan veri gelmezse temizle
const MAX_IMAGE_URL = 256;       // Discord uzun URL'leri sessizce dusuruyor
const PAUSE_GRACE_MS = 2500;     // kisa duraklamalari yok say (sarki gecisi vb.)
const RESEND_MS = 30000;         // Discord sessizce dusurmus olabilir, periyodik tazele
const RETRY_MIN_MS = 3000;       // Discord kapaliysa ilk yeniden deneme
const RETRY_MAX_MS = 15000;      // ust sinir

const OP = { HANDSHAKE: 0, FRAME: 1, CLOSE: 2, PING: 3, PONG: 4 };

/* ---------------- Discord IPC ---------------- */

function pipeCandidates() {
  const list = [];

  if (process.platform === "win32") {
    for (let i = 0; i < 10; i++) list.push(`\\\\?\\pipe\\discord-ipc-${i}`);
    return list;
  }

  const base =
    process.env.XDG_RUNTIME_DIR ||
    process.env.TMPDIR ||
    process.env.TMP ||
    process.env.TEMP ||
    "/tmp";

  const dirs = ["", "snap.discord/", "app/com.discordapp.Discord/"];

  for (const d of dirs) {
    for (let i = 0; i < 10; i++) list.push(path.join(base, d, `discord-ipc-${i}`));
  }
  return list;
}

function encode(op, payload) {
  const data = Buffer.from(JSON.stringify(payload), "utf8");
  const header = Buffer.alloc(8);
  header.writeInt32LE(op, 0);
  header.writeInt32LE(data.length, 4);
  return Buffer.concat([header, data]);
}

function openPipe() {
  const candidates = pipeCandidates();

  return new Promise((resolve, reject) => {
    let i = 0;

    const tryNext = () => {
      if (i >= candidates.length) {
        reject(new Error("Discord IPC pipe not found. Is the Discord desktop app running?"));
        return;
      }

      const target = candidates[i++];
      const sock = net.createConnection(target);

      sock.once("connect", () => {
        sock.removeAllListeners("error");
        resolve(sock);
      });

      sock.once("error", () => {
        sock.destroy();
        tryNext();
      });
    };

    tryNext();
  });
}

/* ---------------- Durum ---------------- */

let ipc = null;
let ready = false;
let currentClientId = null;
let connecting = false;

let paused = false;
let extensionConnected = false;

let nextAttemptAt = 0;
let retryDelay = RETRY_MIN_MS;
let waitingLogged = false;

let latest = null;
let latestAt = 0;

let lastKey = "none";
let lastEnd = null;
let lastSentAt = 0;
let lastActivity = null;
let pausedSince = 0;

const badImages = new Set();

function clientIdFor(site) {
  return (site && CLIENT_IDS[site]) || CLIENT_IDS._default;
}

/* ---------------- Aktivite kurulumu ---------------- */

function elapsed(s) {
  if (!s) return 0;

  const age = s.sampledAt ? Math.max(0, Date.now() - s.sampledAt) / 1000 : 0;
  const t = s.isPlaying ? s.currentTime + age : s.currentTime;

  if (s.duration && isFinite(s.duration)) return Math.min(t, s.duration);
  return t;
}

function plannedEnd(s) {
  if (!s || !s.isPlaying || !s.duration || !isFinite(s.duration)) return null;
  return Math.round(Date.now() + (s.duration - elapsed(s)) * 1000);
}

function key(s) {
  return s ? `${s.site}|${s.title}|${s.subtitle}|${s.isPlaying}` : "none";
}

function pad(str) {
  const t = String(str || "").trim().slice(0, 127);
  return t.length >= 2 ? t : null;
}

// buyuk gorsel: kapak varsa kapak, yoksa site logosu
// kucuk gorsel (kose rozeti): kapak kullanildiysa site logosu
function buildAssets(s) {
  let cover = "";

  if (s.imageUrl && /^https:\/\//.test(s.imageUrl) && !badImages.has(s.imageUrl)) {
    if (s.imageUrl.length <= MAX_IMAGE_URL) {
      cover = s.imageUrl;
    } else {
      badImages.add(s.imageUrl);
      console.log(`Image URL too long (${s.imageUrl.length} chars), skipped.`);
    }
  }

  const asset = SITE_IMAGES[s.site];
  const logo = asset && !badImages.has(asset) ? asset : "";

  const large = cover || logo;
  if (!large) return null;

  const assets = {
    large_image: large,
    large_text: pad(s.title) || pad(s.siteName) || "Herald"
  };

  // kapak varken logo koseye rozet olarak eklenir
  if (cover && logo) {
    assets.small_image = logo;
    assets.small_text = pad(s.siteName) || "Herald";
  }

  return assets;
}

function buildActivity(s) {
  if (!s || !pad(s.title)) return null;

  const activity = {
    type: typeof s.activityType === "number" ? s.activityType : 3,
    details: pad(s.title)
  };

  const assets = buildAssets(s);
  if (assets) activity.assets = assets;

  if (s.isPlaying) {
    if (pad(s.subtitle)) activity.state = pad(s.subtitle);

    if (s.isLive) {
      activity.state = pad(`${s.subtitle ? s.subtitle + " — " : ""}Live`);
      if (s.currentTime > 0) {
        activity.timestamps = { start: Math.round(Date.now() - elapsed(s) * 1000) };
      }
    } else if (s.duration && isFinite(s.duration) && s.duration > 0) {
      const now = Date.now();
      const t = elapsed(s);

      activity.timestamps = {
        start: Math.round(now - t * 1000),
        end: Math.round(now + (s.duration - t) * 1000)
      };
    }
  } else {
    activity.state = pad(s.subtitle ? `${s.subtitle} — Paused` : "Paused");
  }

  return activity;
}

function writeActivity(activity) {
  if (!ipc || !ready) return;

  const args = { pid: process.pid };
  if (activity) args.activity = activity;

  ipc.write(encode(OP.FRAME, {
    cmd: "SET_ACTIVITY",
    nonce: crypto.randomUUID(),
    args
  }));

  console.log("->", activity ? `${activity.details} | ${activity.state || ""}` : "cleared");
}

/* ---------------- IPC baglantisi ---------------- */

function handleFrame(op, data) {
  if (op === OP.PING) {
    ipc.write(encode(OP.PONG, data));
    return;
  }

  if (data.evt === "READY") {
    ready = true;
    console.log(`READY (${currentClientId}):`, data.data && data.data.user && data.data.user.username);
    return;
  }

  if (data.evt === "ERROR") {
    console.error("Discord error:", JSON.stringify(data.data));
    console.error("Rejected activity:", JSON.stringify(lastActivity));

    const a = lastActivity && lastActivity.assets;
    const candidates = a ? [a.large_image, a.small_image].filter(Boolean) : [];
    let changed = false;

    for (const img of candidates) {
      if (badImages.has(img)) continue;

      badImages.add(img);
      changed = true;

      console.log(
        /^https:\/\//.test(img)
          ? "External image rejected, blacklisted."
          : `Asset "${img}" not found in this Application, will not be used again.`
      );
    }

    if (changed) {
      lastKey = "none";
      lastSentAt = 0;
    }
  }
}

function teardown() {
  ready = false;

  if (ipc) {
    ipc.removeAllListeners();
    ipc.destroy();
    ipc = null;
  }

  currentClientId = null;
}

async function connectTo(clientId) {
  if (connecting) return;

  connecting = true;
  teardown();

  let sock;

  try {
    sock = await openPipe();
  } catch (e) {
    connecting = false;

    // Discord kapali — sessizce bekle, log'u doldurma
    if (!waitingLogged) {
      console.log("Discord not found, waiting for it to start...");
      waitingLogged = true;
    }

    nextAttemptAt = Date.now() + retryDelay;
    retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    return;
  }

  ipc = sock;
  currentClientId = clientId;

  let buf = Buffer.alloc(0);

  ipc.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);

    while (buf.length >= 8) {
      const op = buf.readInt32LE(0);
      const len = buf.readInt32LE(4);
      if (buf.length < 8 + len) break;

      let data;
      try {
        data = JSON.parse(buf.subarray(8, 8 + len).toString("utf8"));
      } catch {
        buf = buf.subarray(8 + len);
        continue;
      }

      buf = buf.subarray(8 + len);
      handleFrame(op, data);
    }
  });

  ipc.on("close", () => {
    const wasReady = ready;
    teardown();

    if (wasReady) console.log("Lost connection to Discord, will retry.");

    nextAttemptAt = Date.now() + RETRY_MIN_MS;
    retryDelay = RETRY_MIN_MS;
    waitingLogged = false;
  });

  ipc.on("error", () => {
    // close zaten arkasindan gelir
  });

  ipc.write(encode(OP.HANDSHAKE, { v: 1, client_id: clientId }));

  // yeni baglantida aktiviteyi bastan gonder
  lastKey = "none";
  lastEnd = null;
  lastSentAt = 0;

  // basarili baglanti backoff'u sifirlar
  retryDelay = RETRY_MIN_MS;
  waitingLogged = false;
  connecting = false;
}

/* ---------------- Dongu ---------------- */

function tick() {
  if (latest && Date.now() - latestAt > IDLE_CLEAR_MS) latest = null;

  refreshTrayStatus();

  if (paused) {
    if (ready && lastKey !== "none") {
      lastKey = "none";
      lastEnd = null;
      lastActivity = null;
      writeActivity(null);
    }
    return;
  }

  const wanted = clientIdFor(latest && latest.site);

  if (wanted !== currentClientId) {
    if (Date.now() >= nextAttemptAt) connectTo(wanted);
    return;
  }

  if (!ready) return;

  // Sarki gecislerinde oynatici bir an duraklar. Bunu ciddiye alirsak
  // arka arkaya uc guncelleme gonderip Discord'un limitini doldururuz.
  let view = latest;

  if (latest && !latest.isPlaying) {
    if (!pausedSince) pausedSince = Date.now();
    if (Date.now() - pausedSince < PAUSE_GRACE_MS) view = { ...latest, isPlaying: true };
  } else {
    pausedSince = 0;
  }

  const k = key(view);
  const important = k !== lastKey;

  let drift = false;
  if (!important && view && view.isPlaying) {
    const end = plannedEnd(view);
    drift = end != null && lastEnd != null && Math.abs(end - lastEnd) > DRIFT_TOLERANCE_MS;
  }

  // Discord guncellemeyi sessizce dusurmus olabilir; belirli araliklarla tazele
  const stale = view && Date.now() - lastSentAt > RESEND_MS;

  if (!important && !drift && !stale) return;
  if (Date.now() - lastSentAt < (important ? MIN_GAP_MS : MINOR_GAP_MS)) return;

  lastKey = k;
  lastSentAt = Date.now();

  const activity = buildActivity(view);
  lastActivity = activity;
  lastEnd = activity && activity.timestamps ? activity.timestamps.end : null;

  writeActivity(activity);
}

/* ---------------- Baslat ---------------- */

const wss = new WebSocketServer({ host: "127.0.0.1", port: PORT });

// port kilit gorevi gorur: doluysa zaten baska bir Herald calisiyor
wss.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error("Herald is already running. Exiting.");
    process.exit(0);
  }

  console.error("WebSocket server error:", e.message);
});

wss.on("listening", () => {
  console.log(`WebSocket listening on ws://127.0.0.1:${PORT}`);
});

wss.on("connection", (ws, req) => {
  // Herhangi bir web sitesi de localhost'a WebSocket acabilir.
  // Sadece tarayici uzantilarindan gelen baglantilari kabul et.
  const origin = (req && req.headers && req.headers.origin) || "";

  if (!/^(chrome|moz|safari-web)-extension:\/\//.test(origin)) {
    console.warn("Rejected connection from unexpected origin:", origin || "(none)");
    ws.close();
    return;
  }

  extensionConnected = true;
  console.log("Extension connected.");

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type !== "state") return;

    latest = msg.payload || null;
    latestAt = Date.now();
  });

  ws.on("close", () => {
    extensionConnected = wss.clients.size > 0;
    console.log("Extension disconnected.");
    latest = null;
  });
});

let tray = { setStatus() {} };

async function setupTray() {
  const autostartEnabled = await autostart.isEnabled();

  tray = initTray({
    autostartSupported: autostart.supported,
    autostartEnabled,

    async onToggleAutostart() {
      const enabled = await autostart.toggle();
      console.log(enabled ? "Autostart enabled." : "Autostart disabled.");
      return enabled;
    },

    onPause() {
      paused = !paused;
      console.log(paused ? "Paused." : "Resumed.");
      return paused;
    },
    onQuit() {
      shutdown();
    }
  });
}

setupTray();

function refreshTrayStatus() {
  let text;

  if (paused) text = "Paused";
  else if (!ready) text = "Waiting for Discord";
  else if (!extensionConnected) text = "Waiting for browser";
  else if (latest && latest.title) text = latest.title.slice(0, 40);
  else text = "Idle";

  tray.setStatus(text);
}

setInterval(tick, 1000);
connectTo(CLIENT_IDS._default);

function shutdown() {
  console.log("--- Herald stopping ---");
  writeActivity(null);
  setTimeout(() => process.exit(0), 300);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);