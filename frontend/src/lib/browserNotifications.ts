// Системные уведомления браузера. Нужны, чтобы напоминание Енота было видно, даже когда вкладка свёрнута.
// Работают только пока сайт открыт в браузере: push-сервера у проекта нет.

export function notificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

export async function askNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.requestPermission()
}

export async function showSystemNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (notificationPermission() !== 'granted') return false
  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, { body, tag, icon: '/favicon.svg', badge: '/favicon.svg' })
    return true
  } catch {
    return false
  }
}
