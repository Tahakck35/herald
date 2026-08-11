const SITES = [
  { id: "youtube", name: "YouTube" },
  { id: "youtube-music", name: "YouTube Music" },
  { id: "netflix", name: "Netflix" },
  { id: "prime-video", name: "Prime Video" },
  { id: "max", name: "Max" },
  { id: "disney-plus", name: "Disney+" },
  { id: "spotify", name: "Spotify" },
  { id: "twitch", name: "Twitch" }
];

const el = (id) => document.getElementById(id);

let settings = { enabled: true, hideTitle: false, sites: {} };

function save() {
  chrome.storage.sync.set({ herald: settings });
  paintDimming();
}

function paintDimming() {
  el("sites").classList.toggle("off", settings.enabled === false);
}

function renderSites() {
  const box = el("sites");
  box.textContent = "";

  for (const site of SITES) {
    const row = document.createElement("div");
    row.className = "row";

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = site.name;

    const sw = document.createElement("label");
    sw.className = "sw";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = settings.sites[site.id] !== false;
    input.addEventListener("change", () => {
      settings.sites[site.id] = input.checked;
      save();
    });

    sw.append(input, document.createElement("i"));
    row.append(label, sw);
    box.append(row);
  }

  paintDimming();
}

function renderStatus(status) {
  const connected = !!(status && status.connected);

  el("led").className = "led" + (connected ? " on" : "");
  el("stateText").textContent = connected ? "Connected" : "Companion off";
  el("foot").textContent = connected ? "" : "Start the Herald companion app to broadcast.";

  const banner = el("banner");
  const p = status && status.current;

  if (p && p.title) {
    banner.classList.remove("idle");
    el("eyebrow").textContent = p.isPlaying ? "Now broadcasting" : "Paused";
    el("bannerTitle").textContent = p.title;
    el("bannerMeta").textContent = [p.siteName, p.subtitle].filter(Boolean).join(" · ");
  } else {
    banner.classList.add("idle");
    el("eyebrow").textContent = "Standing by";
    el("bannerTitle").textContent = "Play something and it shows up here";
    el("bannerMeta").textContent = "";
  }
}

function refresh() {
  chrome.runtime.sendMessage({ type: "herald:status" }, (res) => {
    if (chrome.runtime.lastError) return;
    renderStatus(res);
  });
}

chrome.storage.sync.get("herald", (data) => {
  if (data.herald) settings = { ...settings, ...data.herald };

  el("enabled").checked = settings.enabled !== false;
  el("hideTitle").checked = !!settings.hideTitle;

  renderSites();
  refresh();
});

el("enabled").addEventListener("change", (e) => {
  settings.enabled = e.target.checked;
  save();
});

el("hideTitle").addEventListener("change", (e) => {
  settings.hideTitle = e.target.checked;
  save();
});

setInterval(refresh, 1000);