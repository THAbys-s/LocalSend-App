import { useState } from "react";
import type { Transfer } from "../../../shared";
import { formatBytes, formatSpeed, formatTime } from "../../utils/format";

interface Props {
  transfer: Transfer;
  onCancel: () => void;
  onDismiss: () => void;
}

export function TransferMonitor({ transfer, onDismiss }: Props) {
  const [cancelHover, setCancelHover] = useState(false);

  const isComplete = transfer.status === "complete";
  const isError = transfer.status === "error";
  const isCancelled = transfer.status === "cancelled";
  const isPaused = transfer.status === "paused";
  const isTerminal = isComplete || isError || isCancelled;

  const percentComplete = (transfer.progress * 100).toFixed(1);
  const currentSpeed = Number.isFinite(transfer.speed) ? transfer.speed : 0;
  const timeRemaining =
    transfer.status === "transferring" &&
    currentSpeed > 0 &&
    transfer.totalBytes > transfer.bytesSent
      ? formatTime((transfer.totalBytes - transfer.bytesSent) / currentSpeed)
      : "--";

  return (
    <div
      style={{
        ...styles.container,
        ...(isComplete && styles.containerComplete),
        ...(isError && styles.containerError),
      }}
    >
      <div style={styles.header}>
        <h3 style={styles.title}>
          {isComplete && "✓ "}
          {isError && "⚠ "}
          {isPaused && "⏸ "}
          {transfer.fileName}
        </h3>
        <p style={styles.statusText}>{getStatusText(transfer)}</p>
        {isTerminal && (
          <button
            style={{
              ...styles.cancelBtn,
              color: cancelHover ? "#0D1117" : "#6B7280",
              transform: cancelHover ? "scale(1.1)" : "scale(1)",
            }}
            onClick={onDismiss}
            onMouseEnter={() => setCancelHover(true)}
            onMouseLeave={() => setCancelHover(false)}
          >
            ✕
          </button>
        )}
      </div>

      <div style={styles.progressContainer}>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${Math.min(transfer.progress * 100, 100)}%`,
            }}
          />
        </div>
        <p style={styles.percent}>{percentComplete}%</p>
      </div>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Velocidad</span>
          <span style={styles.statValue}>{formatSpeed(transfer.speed)}</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Progreso</span>
          <span style={styles.statValue}>
            {formatBytes(transfer.bytesSent)} /{" "}
            {formatBytes(transfer.totalBytes)}
          </span>
        </div>
        {transfer.status === "transferring" && (
          <div style={styles.stat}>
            <span style={styles.statLabel}>Estimado</span>
            <span style={styles.statValue}>{timeRemaining}</span>
          </div>
        )}
      </div>

      {(isError || isCancelled) && (
        <p style={styles.error}>
          {" "}
          {transfer.errorMessage ??
            (isCancelled
              ? "La transferencia fue cancelada."
              : "La transferencia falló. Revisá tu conexión.")}{" "}
        </p>
      )}
    </div>
  );
}

function getStatusText(transfer: Transfer) {
  switch (transfer.status) {
    case "connecting":
      return "Conectando con el dispositivo...";

    case "transferring":
      return "Enviando archivo...";

    case "waiting":
      return "Esperando respuesta...";

    case "paused":
      return "Transferencia pausada.";

    case "complete":
      return "Transferencia completada.";

    case "cancelled":
      return "Transferencia cancelada.";

    case "error":
      switch (transfer.errorCode) {
        case "connection_lost":
          return transfer.resumable
            ? "Conexión perdida. Puede reanudarse."
            : "Conexión perdida. Debe iniciarse nuevamente.";

        case "disk_full":
          return "No hay espacio suficiente.";

        case "permission_denied":
          return "No hay permisos para guardar.";

        case "timeout":
          return "La conexión tardó demasiado.";

        default:
          return transfer.errorMessage ?? "La transferencia falló.";
      }

    default:
      return "";
  }
}

const styles = {
  container: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E8EDF2",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
  },
  containerComplete: {
    borderColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.02)",
  },
  containerError: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.02)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  title: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#0D1117",
    margin: 0,
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis",
  },
  cancelBtn: {
    backgroundColor: "transparent",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    padding: "4px 8px",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  progressContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },
  progressBar: {
    flex: 1,
    height: "8px",
    backgroundColor: "#E8EDF2",
    borderRadius: "4px",
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #00C896, #00A07A)",
    borderRadius: "4px",
    transition: "width 0.3s ease",
  },
  percent: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#00C896",
    minWidth: "45px",
    textAlign: "right" as const,
    margin: 0,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "12px",
    padding: "12px 0",
    borderTop: "1px solid #E8EDF2",
    borderBottom: "1px solid #E8EDF2",
    marginBottom: "12px",
  },
  stat: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  statLabel: {
    fontSize: "12px",
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    fontWeight: 500,
    margin: 0,
  },
  statValue: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#0D1117",
    margin: 0,
  },
  error: {
    fontSize: "14px",
    color: "#EF4444",
    margin: 0,
    padding: "12px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: "12px",
  },
  statusText: {
    fontSize: "14px",
    color: "#6B7280",
    marginBottom: "12px",
  },
};
