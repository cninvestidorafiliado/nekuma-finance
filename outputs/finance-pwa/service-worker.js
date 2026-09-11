const CACHE_NAME = "nekuma-finance-v150";
const APP_SHELL = [
  "./",
  "./index.html",
  "./app.html",
  "./clean.html",
  "./styles.css?v=150",
  "./app.js?v=150",
  "./dashboard.js?v=150",
  "./assets/vendor/Sortable.min.js",
  "./assets/vendor/lucide.min.js",
  "./supabase-config.js?v=26",
  "./manifest.webmanifest",
  "./assets/nekuma-logo-192.png",
  "./assets/nekuma-logo-512.png",
  "./assets/vehicles/audi.png",
  "./assets/vehicles/bmw.png",
  "./assets/vehicles/byd.png",
  "./assets/vehicles/daihatsu.png",
  "./assets/vehicles/ds.png",
  "./assets/vehicles/fiat.png",
  "./assets/vehicles/honda.png",
  "./assets/vehicles/jeep.png",
  "./assets/vehicles/land-rover.png",
  "./assets/vehicles/lexus.png",
  "./assets/vehicles/mazda.png",
  "./assets/vehicles/mercedes.png",
  "./assets/vehicles/mitsubishi.png",
  "./assets/vehicles/nissan.png",
  "./assets/vehicles/porshe.png",
  "./assets/vehicles/subaru.png",
  "./assets/vehicles/suzuki.png",
  "./assets/vehicles/tesla.png",
  "./assets/vehicles/toyota.png",
  "./assets/vehicles/volkswagen.png",
  "./assets/vehicles/volvo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" })))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "FORCE_APP_UPDATE") return;
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.skipWaiting())
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() =>
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (event.request.mode !== "navigate") return Response.error();
        return caches.match("./app.html").then((fallback) => fallback || caches.match("./index.html").then((home) => home || Response.error()));
      })
    )
  );
});
