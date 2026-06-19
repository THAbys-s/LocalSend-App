import React, { useState, useEffect } from 'react';
import { AvailabilityIndicator } from '../renderer/components/AvailabilityIndicator';
import { DropZone } from '../renderer/components/DropZone';
import { DeviceList } from '../renderer/components/DeviceList';
import { TransferMonitor } from '../renderer/components/TransferMonitor.tsx';
import { NotificationCenter } from '../renderer/components/NotificationCenter';
import { TransferConfirmDialog } from '../renderer/components/TransferConfirmDialog';
import { useServer } from './hooks/useServer';
import { useDiscovery } from './hooks/useDiscovery';
import { useTransfer } from './hooks/useTransfer';
import type { TransferRequestData } from '../shared/types';

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    backgroundColor: '#F8FAFB',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E8EDF2',
    padding: '16px 24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  appTitle: {
    fontSize: '24px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    letterSpacing: '-0.5px',
    margin: 0,
  },
  appIcon: {
    fontSize: '28px',
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr 240px',
    gap: '16px',
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
    flex: 1,
    overflow: 'hidden',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  centerPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    overflowY: 'auto' as const,
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    marginBottom: '8px',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E8EDF2',
    borderRadius: '16px',
    padding: '20px',
    textAlign: 'center' as const,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
  },
  statsCardTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#6B7280',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: 0,
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#00C896',
  },
  statStatus: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#10B981',
  },
};

export default function App() {
  const { isListening, startServer, stopServer } = useServer();
  const { devices } = useDiscovery();
  const { transfer, startTransfer, cancelTransfer } = useTransfer();
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: 'info' | 'success' | 'error' }>>([]);
  const [incomingTransfer, setIncomingTransfer] = useState<TransferRequestData | null>(null);
  const [respondingTransfer, setRespondingTransfer] = useState<string | null>(null);

  useEffect(() => {
    startServer();
    return () => stopServer();
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onTransferRequest((data) => {
      console.log('[App] Incoming transfer request:', data);
      setIncomingTransfer(data);
      addNotification(`${data.alias} desea enviar: ${data.file.name}`, 'info');
    });

    return () => {
      window.electronAPI.removeAllListeners('transfer:request');
    };
  }, []);

  const handleFileDrop = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    startTransfer(file);
    addNotification(`Archivo seleccionado: ${file.name}`, 'info');
  };

  const handleAcceptTransfer = async () => {
    if (!incomingTransfer) return;

    setRespondingTransfer(incomingTransfer.deviceId);
    try {
      await window.electronAPI.respondTransfer(incomingTransfer.deviceId, true);
      addNotification(`Transferencia aceptada de ${incomingTransfer.alias}`, 'success');
      setIncomingTransfer(null);
    } catch (err) {
      console.error('Error accepting transfer:', err);
      addNotification('Error al aceptar la transferencia', 'error');
    } finally {
      setRespondingTransfer(null);
    }
  };

  const handleRejectTransfer = async (reason?: string) => {
    if (!incomingTransfer) return;

    setRespondingTransfer(incomingTransfer.deviceId);
    try {
      await window.electronAPI.respondTransfer(incomingTransfer.deviceId, false, reason);
      addNotification(`Transferencia rechazada de ${incomingTransfer.alias}`, 'info');
      setIncomingTransfer(null);
    } catch (err) {
      console.error('Error rejecting transfer:', err);
      addNotification('Error al rechazar la transferencia', 'error');
    } finally {
      setRespondingTransfer(null);
    }
  };

  const addNotification = (message: string, type: 'info' | 'success' | 'error') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.appTitle}>
            <span style={styles.appIcon}>📤</span>
            LocalSend
          </h1>
          <AvailabilityIndicator isActive={isListening} />
        </div>
      </header>

      <main style={styles.mainContent}>
        <aside style={styles.leftPanel}>
          <h2 style={styles.panelTitle}>Dispositivos</h2>
          <DeviceList devices={devices} />
        </aside>

        <section style={styles.centerPanel}>
          <DropZone onFileDrop={handleFileDrop} />
          {transfer && (
            <TransferMonitor transfer={transfer} onCancel={cancelTransfer} />
          )}
        </section>

        <aside style={styles.rightPanel}>
          <div style={styles.statsCard}>
            <h3 style={styles.statsCardTitle}>Conectados</h3>
            <p style={styles.statNumber}>{devices.length}</p>
          </div>
          <div style={styles.statsCard}>
            {transfer ? (
              <>
                <h3 style={styles.statsCardTitle}>Transferencia</h3>
                <p style={styles.statNumber}>{(transfer.progress * 100).toFixed(0)}%</p>
              </>
            ) : (
              <>
                <h3 style={styles.statsCardTitle}>Estado</h3>
                <p style={styles.statStatus}>{isListening ? 'Activo' : 'Inactivo'}</p>
              </>
            )}
          </div>
        </aside>
      </main>

      <NotificationCenter notifications={notifications} />
      <TransferConfirmDialog
        transfer={incomingTransfer}
        onAccept={handleAcceptTransfer}
        onReject={handleRejectTransfer}
        isLoading={respondingTransfer !== null}
      />

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          color: #0D1117;
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #E8EDF2;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #6B7280;
        }
      `}</style>
    </div>
  );
}