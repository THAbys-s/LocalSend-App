import { registerRootComponent } from "expo";
import App from "./App";
import notifee from "@notifee/react-native";

notifee.registerForegroundService(() => {
  return new Promise(() => {});
});

registerRootComponent(App);
