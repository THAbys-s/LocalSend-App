import { registerRootComponent } from "expo";
import notifee from "@notifee/react-native";
import App from "./App";

notifee.registerForegroundService(() => {
  return new Promise(() => {});
});

registerRootComponent(App);
