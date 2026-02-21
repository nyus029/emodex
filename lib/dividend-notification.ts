import { parseStorageNameToJapaneseDate } from '@/lib/invest';

export async function sendDividendReceivedNotification(
  storageName: string,
  eventId: string,
): Promise<void> {
  const dateLabel = parseStorageNameToJapaneseDate(storageName);
  if (!dateLabel) return;

  const title = '配当が届いています';
  const body = `${dateLabel}のあなたから配当が届いています`;
  const url = `/dividend/${eventId}`;

  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') return;
  }
  if (Notification.permission !== 'granted') return;

  const registration = await navigator.serviceWorker
    ?.getRegistration()
    .catch(() => undefined);
  if (registration?.active) {
    registration.active.postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: {
        title,
        options: {
          body,
          icon: '/next.svg',
          badge: '/next.svg',
          data: { url },
        },
      },
    });
  } else {
    new Notification(title, { body, icon: '/next.svg' });
  }
}
