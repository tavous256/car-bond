// Car Bond service worker: keeps the app and its ad videos on the phone so it opens fast, works offline and installs as an app.
const CACHE = "car-bond-v8";
const MEDIA = "car-bond-media-v1"; // ad videos, kept across app updates
const SHELL = [
  "./", "./index.html", "./app.js", "./config.js", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./maskable-512.png", "./apple-touch-icon.png", "./logo.jpg",
  "./wova-rich-1.jpg", "./wova-rich-2.jpg",
];
const VIDEOS = ["./wova-rich-1.mp4", "./wova-rich-2.mp4"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== MEDIA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => saveVideos())
  );
});

// Download the ad videos in full once, so they play instantly and offline.
const saving = new Set();
function saveVideo(url) {
  const abs = new URL(url, self.location).href;
  if (saving.has(abs)) return Promise.resolve();
  saving.add(abs);
  return caches.open(MEDIA).then((c) => c.match(abs).then((hit) => hit || fetch(abs, { cache: "no-cache" }).then((res) => (res.ok && res.status === 200 ? c.put(abs, res) : null))))
    .catch(() => {}).finally(() => saving.delete(abs));
}
function saveVideos() {
  return caches.open(MEDIA).then((c) => c.keys().then((keys) => Promise.all(keys.filter((r) => !VIDEOS.some((v) => r.url === new URL(v, self.location).href)).map((r) => c.delete(r)))))
    .then(() => Promise.all(VIDEOS.map(saveVideo))).catch(() => {});
}

// Serve a saved video, including the partial ("range") requests phones use while playing.
async function videoFromCache(req) {
  const c = await caches.open(MEDIA);
  const hit = await c.match(req.url);
  if (!hit) return null;
  const range = req.headers.get("range");
  if (!range) return hit;
  const buf = await hit.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const size = buf.byteLength;
  let start = m[1] ? parseInt(m[1], 10) : 0;
  let end = m[2] ? parseInt(m[2], 10) : size - 1;
  if (!m[1] && m[2]) { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { "Content-Type": "video/mp4", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" },
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache the database or photo API: listings must always be fresh.
  if (url.hostname.endsWith("supabase.co")) return;

  if (url.origin === self.location.origin && url.pathname.endsWith(".mp4")) {
    e.respondWith(videoFromCache(req).then((r) => r || fetch(req)));
    e.waitUntil(saveVideo(url.pathname.replace(/^.*\//, "./")));
    return;
  }

  // Own files: try the network first so updates arrive, fall back to the saved copy when offline.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req, { cache: "no-cache" }).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Libraries and fonts from CDNs: saved copy first.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
