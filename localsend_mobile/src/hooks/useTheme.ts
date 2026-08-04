import { useColorScheme } from "react-native";
import { Colors, Typography, Spacing, Radius } from "../theme";
import { useThemeMode } from "../context/ThemeContext";

export function useTheme() {
  const systemScheme = useColorScheme();
  const { mode } = useThemeMode();
  const scheme = mode === "system" ? systemScheme : mode;
  const isDark = scheme === "dark";
  const palette = isDark ? Colors.dark : Colors.light;

  return {
    isDark,
    colors: {
      ...palette,
      primary: Colors.primary,
      primaryDark: Colors.primaryDark,
      primaryLight: Colors.primaryLight,
      success: Colors.success,
      error: Colors.error,
      warning: Colors.warning,
      info: Colors.info,
    },
    t: Typography,
    s: Spacing,
    r: Radius,
  };
}

export type Theme = ReturnType<typeof useTheme>;
