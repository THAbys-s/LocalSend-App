import React, { useState } from 'react';

interface Device {
  id: string;
  alias: string;
  ip: string;
  type: 'phone' | 'tablet' | 'pc' | 'unknown';
}

interface Props {
  device: Device;
}

const DEVICE_ICONS: Record<string, string> = {
  phone: '📱',
  tablet: '📱',
  pc: '🖥',
  unknown: '💻',
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E8EDF2',
    borderRadius: '12px',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
  },
  containerHover: {
    borderColor: '#00C896',
    backgroundColor: 'rgba(0, 200, 150, 0.02)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
  },
  icon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0D1117',
    marginBottom: '2px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis',
    margin: 0,
  },
  ip: {
    fontSize: '12px',
    color: '#6B7280',
    fontFamily: 'monospace',
    margin: 0,
  },
  status: {
    display: 'flex',
    alignItems: 'center',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    animation: 'pulse 2s ease-in-out infinite',
  },
};

export function DeviceItem({ device }: Props) {
  const [isHover, setIsHover] = useState(false);
  const icon = DEVICE_ICONS[device.type] || '💻';

  return (
    <>
      <div
        style={{ ...styles.container, ...(isHover && styles.containerHover) }}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
      >
        <div style={styles.icon}>{icon}</div>
        <div style={styles.info}>
          <p style={styles.name}>{device.alias}</p>
          <p style={styles.ip}>{device.ip}</p>
        </div>
        <div style={styles.status}>
          <div style={styles.statusDot} />
        </div>
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