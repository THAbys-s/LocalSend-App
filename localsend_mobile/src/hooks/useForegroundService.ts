import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

export function useForegroundService(
isActive: boolean,
mensaje: string
) {
const notifId = useRef<string | null>(null);

useEffect(() => {
if (!isActive) {
if (notifId.current) {
Notifications.dismissNotificationAsync(notifId.current);
notifId.current = null;
}
return;
}

if (!notifId.current) {
  Notifications.scheduleNotificationAsync({
    content: {
      title: 'LocalSend',
      body: mensaje,
      sticky: true,
      autoDismiss: false,
    },
    trigger: null,
  }).then(id => {
    notifId.current = id;
  });
}

return () => {
  if (notifId.current) {
    Notifications.dismissNotificationAsync(notifId.current);
    notifId.current = null;
  }
};

}, [isActive]);
}
