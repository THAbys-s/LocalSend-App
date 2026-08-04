declare module "*.svg" {
  import { ComponentType } from "react";
  import { SvgProps } from "react-native-svg";
  const content: ComponentType<SvgProps> | { default: ComponentType<SvgProps> };
  export default content;
}
