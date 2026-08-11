// Tray ikonu. systray2 yoksa veya acilmazsa companion konsolda calismaya devam eder.

const path = require("path");

function initTray({ onPause, onQuit, onToggleAutostart, autostartSupported, autostartEnabled }) {
  let SysTray;

  try {
    SysTray = require("systray2").default;
  } catch (e) {
    console.log("systray2 not found, running without tray icon.");
    return { setStatus() {} };
  }

  // Ikon base64 olarak gomulu; paketlenmis exe'de dosya aramaya gerek yok.
  const icon = require("./assets/tray-icon.js");

  // systray2 yardimci programi gercek diskte olmali
  const packaged = !!process.pkg;
  const realDir = packaged ? path.dirname(process.execPath) : __dirname;

  const statusItem = { title: "Connecting...", tooltip: "", checked: false, enabled: false };
  const pauseItem = { title: "Pause", tooltip: "", checked: false, enabled: true };
  const autostartItem = {
    title: "Start with Windows",
    tooltip: "",
    checked: !!autostartEnabled,
    enabled: !!autostartSupported
  };
  const quitItem = { title: "Quit", tooltip: "", checked: false, enabled: true };

  const tray = new SysTray({
    menu: {
      icon,
      isTemplateIcon: false,
      title: "Herald",
      tooltip: "Herald",
      items: [statusItem, SysTray.separator, pauseItem, autostartItem, quitItem]
    },
    debug: false,
    // paketlenmis exe'de yardimci program exe'nin yanina kopyalanir
    copyDir: packaged ? path.join(realDir, "traybin") : true
  });

  const update = (item, seqId) => {
    try {
      tray.sendAction({ type: "update-item", item, seq_id: seqId });
    } catch (e) {
      // tray kapanmis olabilir
    }
  };

  tray.onClick((action) => {
    const title = action.item && action.item.title;

    if (title === "Quit") {
      try {
        tray.kill(false);
      } catch (e) {}
      onQuit();
      return;
    }

    if (title === "Pause" || title === "Resume") {
      const paused = onPause();

      pauseItem.title = paused ? "Resume" : "Pause";
      update(pauseItem, 2);
      return;
    }

    if (title === "Start with Windows") {
      Promise.resolve(onToggleAutostart()).then((enabled) => {
        autostartItem.checked = enabled;
        update(autostartItem, 3);
      });
    }
  });

  tray.ready().catch(() => {});

  return {
    setStatus(text) {
      if (statusItem.title === text) return;
      statusItem.title = text;
      update(statusItem, 0);
    }
  };
}

module.exports = { initTray };
