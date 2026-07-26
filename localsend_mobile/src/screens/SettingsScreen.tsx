import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../hooks/useTheme";
import { DownloadDirSetting } from "../components/DownloadDirSetting";

export function SettingsScreen() {
  const { colors, t, s } = useTheme();
  const navigation = useNavigation();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: s.base }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={[styles.backIcon, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontSize: t.sizes.lg,
              fontWeight: t.weights.bold,
            },
          ]}
        >
          Ajustes
        </Text>
        <View style={styles.backBtn} />
      </View>

      <View style={{ paddingHorizontal: s.base, marginTop: 16 }}>
        <DownloadDirSetting />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  backBtn: { width: 40 },
  backIcon: { fontSize: 24 },
  title: { flex: 1, textAlign: "center" },
});
