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
    <Svg width={size} height={size} viewBox="0 0 30 30" fill="none" {...props}>
      <Path
        d="M15 3c-2.8966 0-5.5638 1.0301-7.6387 2.7441a1 1 0 0 0-.3633 1.2656c.0059.7694-.5608 1.3748-1.3047 1.4668a1 1 0 0 0-.7271.4432c-1.2413 1.8887-2.0706 4.1525-2.0706 6.58 0 4.2293 2.2002 7.9531 5.5137 10.0879a1 1 0 0 0 1.0176.0391c.1581-.0855.3085-.127 0 0 .4865 0 10.8727 0 10.9727 0a1 1 0 0 0 .6973-.7383C12.7234 26.8275 13.8406 27 15 27c6.6155 0 12-5.3845 12-12 0-6.6155-5.3845-12-12-12z"
        fill={color}
      />
    </Svg>
  );
}
