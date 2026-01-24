
const CACHE_NAME = 'pipper-confeitaria-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Listener para notificações push (se implementado via servidor futuramente)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Novo Pedido na Pipper!';
  const options = {
    body: data.body || 'Você recebeu um novo pedido no cardápio.',
    icon: 'https://ugc.production.linktr.ee/fecf1c45-dcf7-4775-8db7-251ba55caa85_Prancheta-1.png?io=true&size=avatar-v3_0',
    badge: 'https://ugc.production.linktr.ee/fecf1c45-dcf7-4775-8db7-251ba55caa85_Prancheta-1.png?io=true&size=avatar-v3_0',
    data: { url: '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
