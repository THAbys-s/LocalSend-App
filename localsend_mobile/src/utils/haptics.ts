import * as Haptics from "expo-haptics";

// al confirmar un envío exitoso
export const hapticSuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// al detectar un error
export const hapticError = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// feedback liviano, al tocar un botón de aceptar/rechazar
export const hapticTap = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// feedback de impacto medio, al seleccionar un archivo o imagen
export const hapticMedium = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
