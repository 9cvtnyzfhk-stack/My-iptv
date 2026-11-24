
/* My IPTV - Playback Engine */

const MyIPTV = (() => {
  let channels = [];
  let currentChannel = null;

  function parseM3U(text) {
    const lines = text.split(/\r?\n/);
    const result = [];
    let info = {};

    for (const raw of lines) {
      const line = raw.trim();

      if (line.startsWith("#EXTINF:")) {
        const name = line.split(",").pop().trim();
        const group = line.match(/group-title="([^"]*)"/);
        const logo = line.match(/tvg-logo="([^"]*)"/);

        info = {
          name: name || "Unknown channel",
          group: group ? group[1] : "Other",
          logo: logo ? logo[1] : ""
        };
      } else if (line && !line.startsWith("#")) {
        if (/^https?:\/\//i.test(line)) {
          result.push({
            ...info,
            url: line
          });
        }
        info = {};
      }
    }

    return result;
  }

  async function loadM3U(url) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Playlist download failed");
    }

    const text = await response.text();
    channels = parseM3U(text);

    if (!channels.length) {
      throw new Error("No channels found");
    }

    return channels;
  }

  async function loadXtream(server, username, password) {
    const base = server.replace(/\/+$/, "");

    const api = new URL(base + "/player_api.php");
    api.searchParams.set("username", username);
    api.searchParams.set("password", password);
    api.searchParams.set("action", "get_live_streams");

    const response = await fetch(api);

    if (!response.ok) {
      throw new Error("Xtream connection failed");
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid Xtream response");
    }

    channels = data.map(item => ({
      name: item.name || "Channel",
      logo: item.stream_icon || "",
      group: item.category_name || "Other",
      url: base + "/live/" +
        encodeURIComponent(username) + "/" +
        encodeURIComponent(password) + "/" +
        item.stream_id + ".ts"
    }));

    return channels;
  }

  function play(index, video) {
    const channel = channels[index];

    if (!channel || !video) return;

    currentChannel = channel;
    video.src = channel.url;
    video.load();

    return video.play();
  }

  return {
    parseM3U,
    loadM3U,
    loadXtream,
    play,
    getChannels: () => channels,
    getCurrentChannel: () => currentChannel
  };
})();

window.MyIPTV = MyIPTV;
