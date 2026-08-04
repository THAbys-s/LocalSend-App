import { useEffect, useState } from "react";
import {
  transferReceiverService,
  ReceiverError,
} from "../services/TransferReceiverService";

const MESSAGES: Record<ReceiverError["reason"], string> = {
  no_folder: "No configuraste una carpeta de destino. Andá a Ajustes.",
  no_space: "No hay espacio suficiente para recibir el archivo.",
  permission_denied:
    "Se perdió el permiso de la carpeta elegida. Volvé a seleccionarla.",
  write_error: "Ocurrió un error al guardar el archivo.",
  unknown: "No se pudo recibir el archivo.",
};

export function useReceiverErrors() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const unsub = transferReceiverService.addErrorListener((err) => {
      setToast(MESSAGES[err.reason] ?? MESSAGES.unknown);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return toast;
}
