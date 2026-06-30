interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface Props {
  notifications: Notification[];
}

const styles = {
  container: {
    position: 'fixed' as const,
    bottom: '24px',
    right: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    pointerEvents: 'none' as const,
    zIndex: 1000,
  },
  notification: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E8EDF2',
    borderRadius: '12px',
    fontSize: '14px',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
    animation: 'slideIn 0.3s ease-out',
    pointerEvents: 'all' as const,
  },
  notificationSuccess: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.02)',
  },
  notificationError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
  },
  notificationInfo: {
    borderColor: '#00C896',
    backgroundColor: 'rgba(0, 200, 150, 0.02)',
  },
  icon: {
    fontWeight: 700,
    minWidth: '20px',
    textAlign: 'center' as const,
  },
  iconSuccess: {
    color: '#10B981',
  },
  iconError: {
    color: '#EF4444',
  },
  iconInfo: {
    color: '#00C896',
  },
  message: {
    margin: 0,
    color: '#0D1117',
  },
};

export function NotificationCenter({ notifications }: Props) {
  return (
    <>
      <div style={styles.container}>
        {notifications.map(notif => {
          let notifStyle = styles.notification;
          let iconStyle = styles.icon;

          if (notif.type === 'success') {
            notifStyle = { ...notifStyle, ...styles.notificationSuccess };
            iconStyle = { ...iconStyle, ...styles.iconSuccess };
          } else if (notif.type === 'error') {
            notifStyle = { ...notifStyle, ...styles.notificationError };
            iconStyle = { ...iconStyle, ...styles.iconError };
          } else {
            notifStyle = { ...notifStyle, ...styles.notificationInfo };
            iconStyle = { ...iconStyle, ...styles.iconInfo };
          }

          return (
            <div key={notif.id} style={notifStyle}>
              <span style={iconStyle}>
                {notif.type === 'success' && '✓'}
                {notif.type === 'error' && '✕'}
                {notif.type === 'info' && 'ℹ'}
              </span>
              <p style={styles.message}>{notif.message}</p>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}