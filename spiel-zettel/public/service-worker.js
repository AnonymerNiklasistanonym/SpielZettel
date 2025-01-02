self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cache) => {
            if (cache !== 'my-cache') {
              console.log('Deleting old cache:', cache);
              return caches.delete(cache);
            }
          })
        )
      )
    );
  });

  self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
  });
