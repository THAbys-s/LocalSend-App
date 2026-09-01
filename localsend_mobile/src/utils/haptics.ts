import { Platform, Vibration } from "react-native";
import * as Haptics from "expo-haptics";

const runHaptic = async (
  action: () => Promise<unknown>,
  fallback: () => void,
) => {
  if (Platform.OS === "web") return;

  try {
    await action();
  } catch {
    try {
      fallback();
    } catch {
      // no-op
    }
  }
};

// al confirmar un envío exitoso
export const hapticSuccess = () =>
  runHaptic(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    () => Vibration.vibrate([18, 30, 18]),
  );

// al detectar un error
export const hapticError = () =>
  runHaptic(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    () => Vibration.vibrate([0, 50, 30, 50]),
  );

// feedback liviano, al tocar un botón de aceptar/rechazar
export const hapticTap = () =>
  runHaptic(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    () => Vibration.vibrate(12),
  );

// feedback de impacto medio, al seleccionar un archivo o imagen
export const hapticMedium = () =>
  runHaptic(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    () => Vibration.vibrate([0, 18, 18]),
  );
