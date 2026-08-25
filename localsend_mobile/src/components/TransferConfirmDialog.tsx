import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { IncomingTransferRequest } from "../services/TransferReceiverService";

interface Props {
  transfer: IncomingTransferRequest | null;
  onAccept: () => void;
  onReject: () => void;
}

const formatSize = (bytes: number) => {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1000 * 1000) return `${(bytes / 1000).toFixed(1)} KB`;
  if (bytes < 1000 * 1000 * 1000)
    return `${(bytes / 1000 / 1000).toFixed(2)} MB`;
  return `${(bytes / 1000 / 1000 / 1000).toFixed(2)} GB`;
};

export function TransferConfirmDialog({ transfer, onAccept, onReject }: Props) {
  if (!transfer) return null;

  return (
    <Modal transparent animationType="fade" visible={!!transfer}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Solicitud de transferencia</Text>
          <Text style={styles.subtitle}>De: {transfer.alias}</Text>
          <Text style={styles.fileName}>{transfer.file.name}</Text>
          <Text style={styles.fileInfo}>
            {formatSize(transfer.file.size)} • {transfer.file.mimeType}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
              <Text style={styles.rejectText}>Rechazar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
              <Text style={styles.acceptText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dialog: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "85%",
  },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6B7280", marginBottom: 4 },
  fileName: { fontSize: 14, fontWeight: "600", marginBottom: 16 },
  fileInfo: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 16,
  },
  actions: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  rejectBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  acceptBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#00C896",
  },
  rejectText: { color: "#374151", fontWeight: "600" },
  acceptText: { color: "#fff", fontWeight: "600" },
});
