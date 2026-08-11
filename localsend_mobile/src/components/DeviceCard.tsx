import { useEffect } from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Desktop, Check, CaretRight } from "phosphor-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "../hooks/useTheme";
import { DiscoveredDevice } from "../services/DiscoveryService";

const AVATAR_COLORS = [
  "#00C896",
  "#7C3AED",
  "#3B82F6",
  "#EF4444",
  "#F59E0B",
  "#10B981",
];

function avatarColorFor(alias: string): string {
  let hash = 0;
  for (const ch of alias) hash = (hash * 31 + ch.charCodeAt(0)) & 0xfffffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface Props {
  device: DiscoveredDevice;
  selected: boolean;
  onPress: (device: DiscoveredDevice) => void;
}

export function DeviceCard({ device, selected, onPress }: Props) {
  const { colors, t, s, r } = useTheme();
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 200 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderColor = selected ? colors.primary : "transparent";
  const avatarBg = avatarColorFor(device.alias) + "20";

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(device)}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderRadius: r.lg,
            borderColor,
            padding: s.base,
          },
        ]}
      >
        {/* Avatar */}
        <View
          style={[
            styles.avatar,
            { backgroundColor: avatarBg, borderRadius: r.md },
          ]}
        >
          <Desktop size={24} color={colors.text} weight="regular" />
          <View
            style={[styles.onlineDot, { backgroundColor: colors.success }]}
          />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text
            numberOfLines={1}
            style={[
              styles.alias,
              {
                color: colors.text,
                fontSize: t.sizes.md,
                fontWeight: t.weights.semibold,
              },
            ]}
          >
            {device.alias}
          </Text>
          <Text
            style={[
              styles.ip,
              { color: colors.textSecondary, fontSize: t.sizes.sm },
            ]}
          >
            {device.ip}
          </Text>
        </View>

        {/* Indicator */}
        <View style={{ marginLeft: 8 }}>
          {selected ? (
            <Check size={20} color={colors.primary} weight="bold" />
          ) : (
            <CaretRight size={20} color={colors.textMuted} weight="bold" />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    position: "relative",
  },
  avatarIcon: {
    fontSize: 26,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#fff",
  },
  info: {
    flex: 1,
  },
  alias: {
    marginBottom: 2,
  },
  ip: {
    fontFamily: "monospace",
  },
  indicator: {
    fontSize: 22,
    fontWeight: "300",
    marginLeft: 8,
  },
});
