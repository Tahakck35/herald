// Companion app kopru + sekme onceliklendirme (yapiskan kazanan).

const WS_URL = "ws://127.0.0.1:6970";
const STALE_MS = 4000;     // bu sure veri gelmeyen sekme dusurulur
const RETRY_MS = 15000;    // companion kapaliysa yeniden deneme araligi

let ws = null;
let connecting = false;
let lastAttempt = 0;
let winnerTabId = null;

let settings = { enabled: true, hideTitle: false, sites: {} };

chrome.storage.sync.get("herald", (data) => {
  if (data && data.herald) settings = { ...settings, ...data.herald };
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes.herald) return;
  settings = { ...settings, ...changes.herald.newValue };
  sendToCompanion(applySettings(pickWinner()));
});

function siteEnabled(site) {
  return settings.enabled !== false && settings.sites[site] !== false;
}

// gizli mod: baslik yerine sadece site adi
function applySettings(payload) {
  if (!payload) return null;
  if (!settings.hideTitle) return payload;

  return {
    ...payload,
    title: payload.siteName || payload.site,
    subtitle: "",
    imageUrl: ""
  };
}

// tabId -> { payload, updatedAt, playingSince }
const tabs = new Map();

/* ---------------- WebSocket ---------------- */

function connect() {
  if (connecting) return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  if (Date.now() - lastAttempt < RETRY_MS) return;

  lastAttempt = Date.now();
  connecting = true;

  try {
    ws = new WebSocket(WS_URL);
  } catch (e) {
    connecting = false;
    ws = null;
    return;
  }

  ws.onopen = () => {
    connecting = false;
    console.log("[Herald] companion baglandi");
  };

  ws.onclose = () => {
    connecting = false;
    ws = null;
  };

  ws.onerror = () => {
    connecting = false;
  };
}

function sendToCompanion(payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    // gosterecek bir sey yokken bosuna baglanma (konsolu hatayla doldurmasin)
    if (payload) connect();
    return;
  }
  ws.send(JSON.stringify({ type: "state", payload }));
}

/* ---------------- Sekme secimi ---------------- */

function prune() {
  const now = Date.now();
  for (const [id, entry] of tabs) {
    if (now - entry.updatedAt > STALE_MS) tabs.delete(id);
  }
}

function score(p) {
  return (p.isPlaying ? 1000 : 0) + (p.muted ? 0 : 100);
}

function pickWinner() {
  prune();

  // yapiskanlik: mevcut kazanan hala oynuyorsa birakma
  const current = winnerTabId != null ? tabs.get(winnerTabId) : null;
  if (
    current &&
    current.payload &&
    current.payload.isPlaying &&
    siteEnabled(current.payload.site)
  ) {
    return current.payload;
  }

  let bestId = null;
  let best = null;

  for (const [id, entry] of tabs) {
    if (!entry.payload) continue;
    if (!siteEnabled(entry.payload.site)) continue;

    if (
      !best ||
      score(entry.payload) > score(best.payload) ||
      (score(entry.payload) === score(best.payload) && entry.playingSince > best.playingSince)
    ) {
      best = entry;
      bestId = id;
    }
  }

  winnerTabId = bestId;
  return best ? best.payload : null;
}

/* ---------------- Mesajlar ---------------- */

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg && msg.type === "herald:status") {
    respond({
      connected: !!ws && ws.readyState === WebSocket.OPEN,
      current: applySettings(pickWinner()),
      settings
    });
    return true;
  }

  if (!msg || msg.type !== "herald:state") return;

  const tabId = sender.tab && sender.tab.id;
  if (tabId == null) return;

  if (!msg.payload) {
    tabs.delete(tabId);
    if (winnerTabId === tabId) winnerTabId = null;
  } else {
    const prev = tabs.get(tabId);
    const wasPlaying = !!(prev && prev.payload && prev.payload.isPlaying);

    tabs.set(tabId, {
      payload: msg.payload,
      updatedAt: Date.now(),
      playingSince:
        msg.payload.isPlaying && !wasPlaying
          ? Date.now()
          : (prev && prev.playingSince) || 0
    });
  }

  sendToCompanion(applySettings(pickWinner()));
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (!tabs.delete(tabId)) return;
  if (winnerTabId === tabId) winnerTabId = null;
  sendToCompanion(applySettings(pickWinner()));
});