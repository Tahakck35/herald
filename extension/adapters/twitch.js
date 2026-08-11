globalThis.__HeraldAdapter = {
  id: "twitch",
  name: "Twitch",
  activityType: 3,
  poll: 1000,

  getState() {
    const path = location.pathname.replace(/^\//, "");
    const first = path.split("/")[0];
    const isVod = first === "videos";

    const notChannel = [
      "", "directory", "settings", "subscriptions", "following",
      "search", "drops", "wallet", "friends", "downloads", "store", "u", "p"
    ];
    if (!isVod && notChannel.includes(first)) return null;

    const v = HeraldUtil.video();
    if (!v) return null;

    const channel =
      HeraldUtil.text('[data-a-target="user-display-name"]') ||
      HeraldUtil.text('h1[class*="tw-title"]') ||
      (isVod ? "" : first);

    const streamTitle =
      HeraldUtil.text('[data-a-target="stream-title"]') ||
      HeraldUtil.text('[data-test-selector="stream-info-card-component__subtitle"]');

    const category = HeraldUtil.text('[data-a-target="stream-game-link"]');

    const isLive =
      !isVod &&
      (!isFinite(v.duration) || v.duration === Infinity || v.duration > 86400);

    // canli yayin suresi: "27:50:13" -> saniye
    let liveSeconds = 0;
    if (isLive) {
      const upText = HeraldUtil.text('[data-a-target="player-info-live-time"]');

      // sadece "s:dd" veya "s:dd:dd" kabul et, en fazla 48 saat
      if (/^\d{1,3}:\d{2}(:\d{2})?$/.test(upText)) {
        const sec = HeraldUtil.parseTime(upText);
        if (sec > 0 && sec < 172800) liveSeconds = sec;
      }
    }

    // kanal profil fotografi: kanal adi elementinden yukari yuruyup ara
    // (sayfadaki ilk profil gorseli kullanicinin kendi avatari olabiliyor)
    let image = "";
    let node = document.querySelector('[data-a-target="user-display-name"]');

    for (let i = 0; i < 6 && node; i++) {
      const img = node.querySelector('img[src*="profile_image"]');
      if (img) {
        image = img.src;
        break;
      }
      node = node.parentElement;
    }

    const title = streamTitle || channel;
    if (!title) return null;

    return {
      title,
      subtitle: [channel, category].filter((t) => t && t !== title).join(" — "),
      isPlaying: !v.paused && !v.ended,
      muted: v.muted || v.volume === 0,
      currentTime: isLive ? liveSeconds : v.currentTime,
      duration: isLive ? 0 : (isFinite(v.duration) ? v.duration : 0),
      isLive,
      imageUrl: image,
      url: location.href
    };
  }
};