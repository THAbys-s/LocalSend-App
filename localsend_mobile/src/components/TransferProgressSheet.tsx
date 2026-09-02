import { useEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../hooks/useTheme";
import { File } from "phosphor-react-native";
import { TransferProgress } from "../services/TransferService";
import { formatBytes, formatSpeed } from "../utils/deviceInfo";

const STATUS_LABEL: Record<string, string> = {
  connecting: "Conectando...",
  handshaking: "Negociando...",
  sending: "Enviando...",
  success: "¡Enviado!",
  rejected: "Rechazado",
  error: "Error",
};

interface Props {
  progress: TransferProgress;
  onCancel: () => void;
  onDismiss: () => void;
}

export function TransferProgressSheet({
  progress,
  onCancel,
  onDismiss,
}: Props) {
  const { colors, t, s, r } = useTheme();

  const slideY = useSharedValue(300);
  const barFill = useSharedValue(0);

  useEffect(() => {
    slideY.value = withSpring(0, { damping: 18, stiffness: 220 });
  }, []);

  useEffect(() => {
    barFill.value = withTiming(progress.progress, { duration: 120 });
  }, [progress.progress]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${barFill.value * 100}%` as any,
  }));

  const isActive = ["connecting", "handshaking", "sending"].includes(
    progress.status,
  );
  const isSuccess = progress.status === "success";
  const isError = progress.status === "error" || progress.status === "rejected";
  const isImage = progress.fileMime?.startsWith("image/");

  const statusColor = isSuccess
    ? colors.success
    : isError
      ? colors.error
      : colors.primary;

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          backgroundColor: colors.surface,
          borderRadius: r.xl,
          padding: s.xl,
        },
        sheetStyle,
      ]}
    >
      {/* Handle */}
      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      {/* File row */}
      <View style={styles.fileRow}>
        {isImage && progress.thumbnailUri ? (
          <Image
            source={{ uri: progress.thumbnailUri }}
            style={[styles.thumbnail, { borderRadius: r.md }]}
          />
        ) : (
          <View
            style={[
              styles.fileIconBox,
              { backgroundColor: colors.primary + "20", borderRadius: r.md },
            ]}
          >
            <File size={24} color={colors.primary} weight="regular" />
          </View>
        )}

        <View style={styles.fileInfo}>
          <Text
            numberOfLines={2}
            style={[
              styles.fileName,
              {
                color: colors.text,
                fontSize: t.sizes.base,
                fontWeight: t.weights.semibold,
              },
            ]}
          >
            {progress.fileName}
          </Text>
          <Text
            style={[
              styles.fileSize,
              { color: colors.textSecondary, fontSize: t.sizes.sm },
            ]}
          >
            {formatBytes(progress.bytesSent)} /{" "}
            {formatBytes(progress.totalBytes)}
          </Text>
        </View>
      </View>

      {/* Status */}
      <Text
        style={[
          styles.statusLabel,
          {
            color: statusColor,
            fontSize: t.sizes.md,
            fontWeight: t.weights.semibold,
          },
        ]}
      >
        {STATUS_LABEL[progress.status] ?? progress.status}
      </Text>

      {isError && (
        <Text
          style={[
            styles.errorMessage,
            { color: colors.error, fontSize: t.sizes.sm },
          ]}
        >
          {progress.errorMessage ??
            (progress.status === "rejected"
              ? "La transferencia fue rechazada."
              : "La transferencia falló.")}
        </Text>
      )}

      {/* Progress bar */}
      <View
        style={[
          styles.barTrack,
          { backgroundColor: colors.border, borderRadius: r.full },
        ]}
      >
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: statusColor, borderRadius: r.full },
            barStyle,
          ]}
        />
      </View>

      {/* Speed */}
      {progress.status === "sending" && progress.speed > 0 && (
        <Text
          style={[
            styles.speed,
            { color: colors.textSecondary, fontSize: t.sizes.sm },
          ]}
        >
          {formatSpeed(progress.speed)}
        </Text>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {isActive && (
          <TouchableOpacity
            onPress={onCancel}
            style={[
              styles.btn,
              styles.btnOutline,
              { borderColor: colors.border },
            ]}
          >
            <Text style={[styles.btnText, { color: colors.textSecondary }]}>
              Cancelar
            </Text>
          </TouchableOpacity>
        )}
        {(isSuccess || isError) && (
          <TouchableOpacity
            onPress={onDismiss}
            style={[styles.btn, { backgroundColor: statusColor }]}
          >
            <Text style={[styles.btnText, { color: "#fff" }]}>
              {isSuccess ? "Listo" : "Cerrar"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  thumbnail: {
    width: 56,
    height: 56,
    marginRight: 14,
  },
  fileIconBox: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  fileIcon: {
    fontSize: 28,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    marginBottom: 4,
  },
  fileSize: {},
  statusLabel: {
    marginBottom: 10,
  },
  errorMessage: {
    marginBottom: 10,
  },
  barTrack: {
    height: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  barFill: {
    height: 8,
  },
  speed: {
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 10,
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnOutline: {
    borderWidth: 1,
  },
  btnText: {
    fontWeight: "600",
    fontSize: 15,
  },
});
