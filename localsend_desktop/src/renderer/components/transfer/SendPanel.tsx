import type { CSSProperties } from "react";
import type { DeviceInfo, FileToSend } from "../../../shared";

interface SendPanelProps {
  selectedFile: FileToSend | null;
  selectedDevice: DeviceInfo | null;
  onSend: () => void;
  onCancel: () => void;
  isTransferring: boolean;
}

export function SendPanel({
  selectedFile,
  selectedDevice,
  onSend,
  onCancel,
  isTransferring,
}: SendPanelProps) {
  return (
    <div style={styles.selectionCard}>
      <h3 style={styles.title}>Enviar</h3>

      <div style={styles.row}>
        <span style={styles.label}>Archivo</span>
        <span style={selectedFile ? styles.value : styles.placeholder}>
          {selectedFile ? selectedFile.name : "Sin seleccionar"}
        </span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Destino</span>
        <span style={selectedDevice ? styles.value : styles.placeholder}>
          {selectedDevice ? selectedDevice.alias : "Sin seleccionar"}
        </span>
      </div>

      <button
        style={{
          ...styles.sendButton,
          backgroundColor: isTransferring ? "#EF4444" : "#00C896",
          opacity: isTransferring || (selectedFile && selectedDevice) ? 1 : 0.5,
          cursor:
            isTransferring || (selectedFile && selectedDevice)
              ? "pointer"
              : "not-allowed",
        }}
        disabled={isTransferring ? false : !selectedFile || !selectedDevice}
        onClick={
          isTransferring
            ? onCancel
            : selectedFile && selectedDevice
              ? onSend
              : undefined
        }
      >
        {isTransferring ? "Cancelar" : "Enviar"}
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  selectionCard: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E8EDF2",
    borderRadius: "16px",
    padding: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  title: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  row: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },

  label: {
    fontSize: "12px",
    color: "#6B7280",
    fontWeight: 500,
  },

  value: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  placeholder: {
    fontSize: "14px",
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  sendButton: {
    marginTop: "4px",
    width: "100%",
    padding: "10px",
    border: "none",
    borderRadius: "10px",
    backgroundColor: "#00C896",
    color: "#FFFFFF",
    fontSize: "14px",
    fontWeight: 600,
  },
};
