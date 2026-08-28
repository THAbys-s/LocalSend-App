import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Linking } from "react-native";

const KEY = "downloadDirUri";

export async function getDownloadDirUri(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function pickDownloadDir(): Promise<string | null> {
  const perm =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

  if (!perm.granted) {
    if (!perm.canAskAgain || perm.status === "restricted") {
      Alert.alert(
        "Permiso requerido",
        "Necesitamos acceso a una carpeta para guardar archivos. Actívalo desde Ajustes de la app.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Ir a Ajustes", onPress: () => Linking.openSettings() },
        ],
      );
    }
    return null;
  }

  await AsyncStorage.setItem(KEY, perm.directoryUri);
  return perm.directoryUri;
}

export async function clearDownloadDir(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
