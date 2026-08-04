import { Text, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { useTheme } from "../hooks/useTheme";

export function ErrorToast({ message }: { message: string | null }) {
  const { colors, r, s } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: message ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [message]);

  if (!message) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.error ?? "#D64545",
          borderRadius: r.lg,
          opacity,
          padding: s.base,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 999,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  text: { color: "#fff", fontWeight: "600", textAlign: "center" },
});
