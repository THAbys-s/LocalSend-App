import { useState, useEffect } from "react";
import { ServicesStatus, ServerStatusData } from "../../shared";

export function useServer(): ServerStatusData {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<ServicesStatus>({
    udp: false,
    ws: false,
    tcp: false,
  });

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.getServerStatus().then((data) => {
      setIsActive(data.isActive);
      setStatus(data.status);
    });

    window.electronAPI.onServerStatus((data: ServerStatusData) => {
      setIsActive(data.isActive);
      setStatus(data.status);
    });

    return () => {
      window.electronAPI.removeAllListeners("server:status");
    };
  }, []);

  return { isActive, status };
}
