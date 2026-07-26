import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "downloadDirUri";

export async function getDownloadDirUri(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function pickDownloadDir(): Promise<string | null> {
  const perm =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!perm.granted) return null;

  await AsyncStorage.setItem(KEY, perm.directoryUri);
  return perm.directoryUri;
}

export async function clearDownloadDir(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
