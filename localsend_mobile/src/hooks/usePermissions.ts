import * as MediaLibrary from 'expo-media-library';

export function usePermissions() {
  const requestStorage = async (): Promise<boolean> => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  };

  return { requestStorage };
}