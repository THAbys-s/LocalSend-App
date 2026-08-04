import Svg, { Circle, Path, type SvgProps } from "react-native-svg";

export interface SunIconProps extends SvgProps {
  size?: number;
  color?: string;
}

export function SunIcon({
  size = 24,
  color = "#FFC107",
  ...props
}: SunIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      {...props}
    >
      <Circle cx="64" cy="64" r="28" fill={color} />
      <Path
        d="M64 10v18M64 100v18M10 64h18M100 64h18M28 28l12 12M88 88l12 12M28 100l12-12M88 28l12-12"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
      />
    </Svg>
  );
}
