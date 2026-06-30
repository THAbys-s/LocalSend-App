interface Props {
  isActive: boolean;
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 500,
  },
  active: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10B981',
  },
  inactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444',
  },
  led: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    animation: 'pulse 2s ease-in-out infinite',
  },
  activeLed: {
    backgroundColor: '#10B981',
  },
  inactiveLed: {
    backgroundColor: '#EF4444',
  },
};

export function AvailabilityIndicator({ isActive }: Props) {
  return (
    <>
      <div style={{ ...styles.container, ...(isActive ? styles.active : styles.inactive) }}>
        <div style={{ ...styles.led, ...(isActive ? styles.activeLed : styles.inactiveLed) }} />
        <span>{isActive ? 'Activo' : 'Inactivo'}</span>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}