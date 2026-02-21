self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SHOW_NOTIFICATION') return;

  const title = event.data?.payload?.title ?? 'PWA通知';
  const options = event.data?.payload?.options ?? {};

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('push', (event) => {
  const payload = event.data?.json?.() ?? {};
  const title = payload.title ?? 'PWA通知';
  const options = {
    body: payload.body ?? 'Push通知を受信しました。',
    icon: payload.icon ?? '/next.svg',
    badge: payload.badge ?? '/next.svg',
    data: {
      url: payload.url ?? '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existingWindow = clients.find((client) => {
          return client.url.includes(targetUrl);
        });

        if (existingWindow) {
          return existingWindow.focus();
        }

        return self.clients.openWindow(targetUrl);
      }),
  );
});
