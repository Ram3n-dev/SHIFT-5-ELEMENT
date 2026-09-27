// Service worker Енотономики. Нужен только для системных уведомлений Енота:
// ничего не кэширует, поэтому после обновления сайта всегда открывается свежая версия.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Клик по уведомлению — открыть или показать вкладку приложения.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client)
      return open ? open.focus() : self.clients.openWindow('/dashboard')
    }),
  )
})
