import type { DeviceInfo } from '../../../shared/types';
import { DeviceItem } from './DeviceItem';

interface Props {
  devices: DeviceInfo[];
}

export function DeviceList({ devices }: Props) {
  if (devices.length === 0) {
    return (
      <>
        <div style={{ ...styles.container, ...styles.empty }}>
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📡</span>
            <p style={styles.emptyText}>Esperando dispositivos...</p>
          </div>
        </div>
        <style>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </>
    );
  }

  return (
    <div style={styles.container}>
      {devices.map(device => (
        <DeviceItem key={device.id} device={device} />
      ))}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    maxHeight: '400px',
    overflowY: 'auto' as const,
  },
  empty: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: '32px 16px',
    minHeight: '200px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E8EDF2',
  },
  emptyState: {
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '8px',
    animation: 'bounce 2s ease-in-out infinite',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
  },
};