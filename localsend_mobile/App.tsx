import React from 'react';
import { useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { HomeScreen } from './src/screens/HomeScreen';
import { Colors } from './src/theme';

const Stack = createStackNavigator();

const lightTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#F8FAFB', primary: Colors.primary },
};

const darkTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#0D1117', primary: Colors.primary },
};

export default function App() {
  const scheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <NavigationContainer theme={scheme === 'dark' ? darkTheme : lightTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
