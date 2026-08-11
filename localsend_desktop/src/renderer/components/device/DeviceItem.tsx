import { useState } from "react";
import type { DeviceInfo } from "../../../shared";
import type { IconType } from "react-icons";
import { CgDesktop, CgLaptop, CgSmartphone } from "react-icons/cg";

interface Props {
  device: DeviceInfo;
  isSelected: boolean;
  onSelect: () => void;
}

const DEVICE_ICONS: Record<string, IconType> = {
  desktop: CgDesktop,
  laptop: CgLaptop,
  mobile: CgSmartphone,
  unknown: CgSmartphone,
};

export function DeviceItem({ device, isSelected, onSelect }: Props) {
  const [isHover, setIsHover] = useState(false);

  return (
    <>
      <div
        style={{
          ...styles.container,
          ...(isHover && styles.containerHover),
          ...(isSelected && styles.containerSelected),
        }}
        onClick={onSelect}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
      >
        {(() => {
          const Icon = DEVICE_ICONS[device.deviceType] ?? CgLaptop;
          return <Icon size={20} />;
        })()}{" "}
        <div style={styles.info}>
          <p style={styles.name}>{device.alias}</p>
          <p style={styles.ip}>{device.ip}</p>
        </div>
        <div style={styles.statusDot} />
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </>
  );
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E8EDF2",
    borderRadius: "12px",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
  },
  containerHover: {
    borderColor: "#00C896",
    backgroundColor: "rgba(0, 200, 150, 0.02)",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
  },
  containerSelected: {
    border: "2px solid #00C896",
    backgroundColor: "rgba(0, 200, 150, 0.08)",
    boxShadow: "0 2px 6px rgba(0, 200, 150, 0.15)",
  },
  icon: { fontSize: "24px", flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#0D1117",
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis",
    margin: 0,
  },
  ip: {
    fontSize: "12px",
    color: "#6B7280",
    fontFamily: "monospace",
    margin: 0,
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#10B981",
    animation: "pulse 2s ease-in-out infinite",
  },
};
