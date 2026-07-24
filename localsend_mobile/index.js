import { registerRootComponent } from "expo";
import notifee, { AndroidImportance } from "react-native-notify-kit";
import App from "./App";

notifee.registerForegroundService(() => {
  return new Promise(() => {});
});

registerRootComponent(App);
