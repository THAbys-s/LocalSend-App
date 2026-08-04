import { useEffect, useRef } from "react";
import notifee, { AndroidImportance } from "@notifee/react-native";

const CHANNEL_ID = "localsend-transfer";
const NOTIFICATION_ID = "transfer-fg";

export function useForegroundService(isActive: boolean, mensaje: string) {
  const runningRef = useRef(false);

  useEffect(() => {
    if (isActive) {
      _start(mensaje);
    } else if (runningRef.current) {
      _stop();
    }

    return () => {
      if (runningRef.current) _stop();
    };
  }, [isActive, mensaje]);

  async function _start(body: string) {
    try {
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: "Transferencias LocalSend",
        importance: AndroidImportance.LOW,
      });

      await notifee.displayNotification({
        id: NOTIFICATION_ID,
        title: "LocalSend",
        body,
        android: {
          channelId: CHANNEL_ID,
          asForegroundService: true,
          ongoing: true,
          smallIcon: "ic_launcher",
        },
      });

      runningRef.current = true;
    } catch (err) {
      console.warn("[ForegroundService] Error al iniciar:", err);
    }
  }

  async function _stop() {
    try {
      await notifee.stopForegroundService();
      await notifee.cancelNotification(NOTIFICATION_ID);
    } catch (err) {
      console.warn("[ForegroundService] Error al detener:", err);
    } finally {
      runningRef.current = false;
    }
  }
}
