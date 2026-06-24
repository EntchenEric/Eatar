// Dünne Hülle um die Web Notifications API, damit die Settings-Benachrichtigungen
// eine echte Wirkung haben: Beim Aktivieren des Toggles wird die Berechtigung
// angefragt, bei einem Match (Like) erscheint eine System-Notification.

const supportsNotifications =
  typeof window !== 'undefined' && 'Notification' in window;

/** Fragt die Berechtigung an, falls noch nicht entschieden. Liefert true bei Erlaubnis. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supportsNotifications) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

/** Zeigt eine Match-Notification, sofern erlaubt. Ohne Wirkung, falls nicht erlaubt. */
export function notifyMatch(restaurantName: string): void {
  if (!supportsNotifications || Notification.permission !== 'granted') return;
  try {
    new Notification('Neuer Match! 🎉', {
      body: restaurantName ? `Du hast „${restaurantName}" gematched.` : 'Du hast ein neues Restaurant gematched.',
    });
  } catch {
    // Einige Browser erlauben new Notification nur in ServiceWorker-Kontext – ignorieren.
  }
}