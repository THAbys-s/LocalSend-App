import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import {
  pickDownloadDir,
  getDownloadDirUri,
  clearDownloadDir,
} from "../utils/downloadDir";
import { useTheme } from "../hooks/useTheme";
import { usePermissions } from "../hooks/usePermissions";

export function DownloadDirSetting() {
  const { colors, t, s, r } = useTheme();
  const { openSettings } = usePermissions();
  const [dirUri, setDirUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDownloadDirUri()
      .then(setDirUri)
      .finally(() => setLoading(false));
  }, []);

  const handlePick = async () => {
    const uri = await pickDownloadDir();
    if (!uri) {
      openSettings();
      return;
    }
    setDirUri(uri);
  };

  const handleReset = async () => {
    await clearDownloadDir();
    setDirUri(null);
  };

  const displayName = dirUri
    ? decodeURIComponent(dirUri.split("/").pop() ?? dirUri)
    : "Sin configurar";

  if (loading) return null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: r.lg,
          padding: s.base,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: colors.textSecondary,
            fontSize: t.sizes.xs,
            fontWeight: t.weights.semibold,
          },
        ]}
      >
        CARPETA DE DESCARGA
      </Text>

      <Text
        numberOfLines={1}
        style={[
          styles.value,
          {
            color: dirUri ? colors.text : colors.warning,
            fontSize: t.sizes.base,
          },
        ]}
      >
        {displayName}
      </Text>

      {!dirUri && (
        <Text
          style={[
            styles.hint,
            { color: colors.textSecondary, fontSize: t.sizes.sm },
          ]}
        >
          Sin carpeta configurada no vas a poder recibir archivos.
        </Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handlePick}
          style={[
            styles.btn,
            { backgroundColor: colors.primary, borderRadius: r.lg },
          ]}
        >
          <Text style={styles.btnText}>Elegir carpeta</Text>
        </TouchableOpacity>

        {dirUri && (
          <TouchableOpacity
            onPress={handleReset}
            style={[
              styles.btn,
              { backgroundColor: colors.border, borderRadius: r.lg },
            ]}
          >
            <Text style={[styles.btnText, { color: colors.text }]}>Quitar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  label: { letterSpacing: 0.8, marginBottom: 6 },
  value: { fontWeight: "500", marginBottom: 4 },
  hint: { marginBottom: 12, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
});
