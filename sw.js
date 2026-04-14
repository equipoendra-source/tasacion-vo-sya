// SYA Motor — Tasación VO · Service Worker v14
const CACHE_NAME = 'tasacion-vo-sya-v14';
const STATIC_ASSETS = [
    './icons/icon-192.png',
    './icons/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'
];

// Install — solo cachear assets estáticos (imágenes y fuentes)
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    // Activar inmediatamente sin esperar a que se cierren los clientes antiguos
    self.skipWaiting();
});

// Activate — limpiar cachés antiguas y tomar control de todos los clientes
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch — NETWORK-FIRST para HTML, JS y CSS (siempre la versión más nueva)
self.addEventListener('fetch', event => {
    const url = event.request.url;
    const isAppFile = url.includes('index.html') || url.endsWith('.js') || 
                      url.endsWith('.css') || url.includes('?v=');
    const isStatic = url.includes('icon-') || url.includes('fonts.googleapis') ||
                     url.includes('fonts.gstatic');

    if (isAppFile) {
        // NETWORK-FIRST: Siempre intentar descargar la versión más nueva del servidor
        event.respondWith(
            fetch(event.request, { cache: 'no-store' }).then(response => {
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => caches.match(event.request))
        );
    } else if (isStatic) {
        // CACHE-FIRST: Para imágenes y fuentes (no cambian)
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
    } else {
        // Para todo lo demás, red directa
        event.respondWith(fetch(event.request));
    }
});
