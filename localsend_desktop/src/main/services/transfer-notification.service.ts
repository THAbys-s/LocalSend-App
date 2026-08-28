import { Notification, BrowserWindow } from "electron";
import type { TransferRequestData } from "../../shared";
import type { WsTransferService } from "./ws.service";

export function registerTransferNotifications(
  wsService: WsTransferService,
  getMainWindow: () => BrowserWindow | null,
) {
  wsService.on("transfer-request", (data: TransferRequestData) => {
    const win = getMainWindow();
    const appIsVisible = !!win && win.isVisible() && win.isFocused();

    if (appIsVisible) {
      win!.webContents.send("transfer:request", data);
      return;
    }

    const notification = new Notification({
      title: "Solicitud de transferencia",
      body: `${data.alias} quiere enviarte "${data.file.name}"`,
      actions: [
        { type: "button", text: "Aceptar" },
        { type: "button", text: "Rechazar" },
      ],
      timeoutType: "never",
    });

    notification.on("action", (_event, index) => {
      const accepted = index === 0;
      console.log(
        `[Notification] Resolución de transferencia desde toast: ${data.alias} -> ${accepted ? "aceptada" : "rechazada"}`,
      );

      if (accepted) {
        if (win) {
          if (win.isMinimized()) win.restore();
          win.show();
          win.focus();
          win.webContents.send("transfer:request", data);
        }
        return;
      }

      wsService.reject(data.deviceId);

      win?.webContents.send("transfer:resolved-by-notification", {
        deviceId: data.deviceId,
        accepted,
      });
    });

    notification.on("click", () => {
      console.log(
        `[Notification] Click en toast de transferencia: ${data.alias}`,
      );
      if (win) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        win.webContents.send("transfer:request", data);
      }
    });

    console.log(`[Notification] Mostrando toast para: ${data.alias}`);
    notification.show();
  });

  wsService.on("transfer-request-expired", ({ deviceId, alias }) => {
    const win = getMainWindow();
    if (win) {
      win.webContents.send("transfer:request-expired", { deviceId, alias });
    }
    console.log(
      `[Notification] Solicitud de transferencia vencida para: ${alias}`,
    );
  });
}
