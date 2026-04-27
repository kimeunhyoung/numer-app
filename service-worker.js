const CACHE_NAME = "lifecode-cache-v8";

/** 오프라인 첫 실행용 — 이후에는 fetch 핸들러가 네트워크 우선으로 갱신 */
const PRECACHE_URLS = [
    "./",
    "./index.html",
    "./logic.js",
    "./data.js",
    "./data.fixed.js",
    "./data.v3.js",
    "./manifest.json"
];

function isVolatileAppAsset(url) {
    const p = url.pathname;
    return (
        /\.js$/i.test(p) ||
        /\/manifest\.json$/i.test(p) ||
        p.endsWith("/index.html")
    );
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);
    const isSameOrigin = url.origin === self.location.origin;

    if (request.method !== "GET" || !isSameOrigin) return;

    // HTML navigation: network first, then cached index fallback.
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
                    return response;
                })
                .catch(async () => {
                    const cached = await caches.match("./index.html");
                    return cached || new Response("오프라인입니다. 네트워크 연결 후 다시 시도해주세요.", {
                        status: 503,
                        headers: { "Content-Type": "text/plain; charset=utf-8" }
                    });
                })
        );
        return;
    }

    // 스크립트·매니페스트: 네트워크 우선(배포 반영), 실패 시 캐시 — cache-first+ignoreSearch는 ?v= 무시되어 영구 구버전 됨
    if (isVolatileAppAsset(url)) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(request, { ignoreSearch: true }))
        );
        return;
    }

    event.respondWith(
        caches.match(request, { ignoreSearch: true }).then((cached) => {
            if (cached) return cached;
            return fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match("./index.html"));
        })
    );
});