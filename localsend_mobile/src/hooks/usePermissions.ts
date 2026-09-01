import { Alert, Linking } from "react-native";
import * as MediaLibrary from "expo-media-library";

export function usePermissions() {
  const openSettings = () => {
    Linking.openSettings();
  };

  const requestMediaLibrary = async (): Promise<boolean> => {
    const current = await MediaLibrary.getPermissionsAsync();
    if (current.status === "granted") return true;

    const result = await MediaLibrary.requestPermissionsAsync();
    const granted = result.status === "granted";

    if (!granted) {
      Alert.alert(
        "Permiso bloqueado",
        "Para continuar, habilita el acceso a la galería desde Ajustes de la app.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Ir a Ajustes", onPress: openSettings },
        ],
      );
    }

    return granted;
  };

  const requestDirectory = async (): Promise<boolean> => {
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (perm.status === "granted") return true;

    Alert.alert(
      "Acceso bloqueado",
      "Necesitamos permiso para seleccionar la carpeta de destino. Actívalo desde Ajustes.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Ir a Ajustes", onPress: openSettings },
      ],
    );

    return false;
  };

  return { requestMediaLibrary, requestDirectory, openSettings };
}
