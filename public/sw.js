self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  // no-op for now
});

self.addEventListener("fetch", () => {
  // let the network handle everything for now
});
