import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "light" | "dark";

const ThemeModeContext = createContext<{
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}>({ mode: "system", setMode: () => {}, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem("@localsend:theme_mode");
        if (v === "light" || v === "dark" || v === "system")
          setMode(v as ThemeMode);
      } catch (e) {
        // ignorar
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem("@localsend:theme_mode", mode);
      } catch (e) {
        // ignorar
      }
    })();
  }, [mode]);

  const toggle = () => {
    setMode((m) =>
      m === "system" ? "dark" : m === "dark" ? "light" : "system",
    );
  };

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, toggle }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
