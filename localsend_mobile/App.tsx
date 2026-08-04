import { useColorScheme } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { ThemeProvider, useThemeMode } from "./src/context/ThemeContext";
import { Colors } from "./src/theme";

const Stack = createStackNavigator();

const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#F8FAFB",
    primary: Colors.primary,
  },
};

const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0D1117",
    primary: Colors.primary,
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const systemScheme = useColorScheme();
  const { mode } = useThemeMode();

  const effective = mode === "system" ? systemScheme : mode;

  return (
    <>
      <StatusBar style={effective === "dark" ? "light" : "dark"} />
      <NavigationContainer
        theme={effective === "dark" ? darkTheme : lightTheme}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: {
              backgroundColor:
                effective === "dark"
                  ? darkTheme.colors.background
                  : lightTheme.colors.background,
            },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
