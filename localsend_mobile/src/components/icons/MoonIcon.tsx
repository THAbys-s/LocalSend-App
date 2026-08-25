import Svg, { Path, type SvgProps } from "react-native-svg";

export interface MoonIconProps extends SvgProps {
  size?: number;
  color?: string;
}

export function MoonIcon({
  size = 24,
  color = "#ffffff",
  ...props
}: MoonIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" {...props}>
      <Path
        fill={color}
        d="M8 0c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zM8 15c-3.9 0-7-3.1-7-7 0-2.4 1.2-4.6 3.2-5.9-0.1 0.6-0.2 1.3-0.2 1.9 0 4.9 4 8.9 8.9 9-1.3 1.3-3 2-4.9 2z"
      />
    </Svg>
  );
}
