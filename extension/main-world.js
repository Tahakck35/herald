// MAIN world — sayfanin kendi JS ortaminda calisir.
// navigator.mediaSession izole dunyadan okunamadigi icin buradan koprulenir.

(() => {
  function snapshot() {
    const session = navigator.mediaSession;
    if (!session || !session.metadata) return null;

    const md = session.metadata;
    let artwork = "";

    if (md.artwork && md.artwork.length) {
      // en buyuk gorseli sec
      const sorted = [...md.artwork].sort((a, b) => {
        const sa = parseInt((a.sizes || "0x0").split("x")[0], 10) || 0;
        const sb = parseInt((b.sizes || "0x0").split("x")[0], 10) || 0;
        return sb - sa;
      });
      artwork = sorted[0].src || "";
    }

    return {
      title: md.title || "",
      artist: md.artist || "",
      album: md.album || "",
      artwork,
      playbackState: session.playbackState || "none"
    };
  }

  // Netflix kapak gorseli sadece sayfanin kendi state'inde var
  function netflixInfo() {
    if (typeof netflix === "undefined") return null;

    try {
      const vm = netflix.appContext.getState().playerApp.getState().videoPlayer.videoMetadata;
      if (!vm) return null;

      const id = location.pathname.split("/")[2];
      const entry = (id && vm[id]) || vm[Object.keys(vm)[0]];
      const video = entry && entry._metadataObject && entry._metadataObject.video;
      if (!video) return null;

      const first = (arr) => (arr && arr.length && arr[0].url ? arr[0].url : "");

      // dizi ise bolum bilgisini state'ten cikar (DOM'da kontroller gizlenince kayboluyor)
      let subtitle = "";

      try {
        const epId = video.currentEpisode;

        if (epId && video.seasons) {
          video.seasons.forEach((season, index) => {
            for (const ep of season.episodes || []) {
              if (ep.id !== epId) continue;

              // seq bazi dizilerde bos geliyor, sirayi yedek olarak kullan
              const seasonNo =
                season.seq != null ? season.seq
                : season.seasonSeq != null ? season.seasonSeq
                : index + 1;

              const epNo = ep.seq != null ? ep.seq : null;

              const label = [
                seasonNo != null ? `S${seasonNo}` : "",
                epNo != null ? `E${epNo}` : ""
              ].filter(Boolean).join(":");

              subtitle = [label, ep.title].filter(Boolean).join(" ");
            }
          });
        }
      } catch (e) {
        subtitle = "";
      }

      return {
        // storyart en kisa URL'i verir; Discord uzun URL'leri kabul etmiyor
        image: first(video.storyart) || first(video.artwork) || first(video.boxart),
        title: video.title || "",
        subtitle
      };
    } catch (e) {
      return null;
    }
  }

  function post() {
    window.postMessage(
      { __herald_ms: snapshot(), __herald_site: netflixInfo() },
      "*"
    );
  }

  setInterval(post, 1000);
  post();
})();