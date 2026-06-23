import React, { useState } from 'react';
import type { TransferRequestData } from '../../../shared';
import { formatBytes } from '../../utils/format';

interface Props {
  transfer: TransferRequestData | null;
  onAccept: () => void;
  onReject: (reason?: string) => void;
  isLoading?: boolean;
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼';
  if (['mp4', 'avi', 'mov', 'mkv'].includes(ext))           return '🎬';
  if (ext === 'pdf')                                         return '📄';
  if (['zip', 'rar', '7z'].includes(ext))                   return '📦';
  return '📁';
}

export function TransferConfirmDialog({
  transfer,
  onAccept,
  onReject,
  isLoading = false,
}: Props) {
  const [rejectHover, setRejectHover] = useState(false);
  const [acceptHover, setAcceptHover] = useState(false);

  if (!transfer) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <div style={styles.header}>
          <h2 style={styles.title}>Solicitud de transferencia</h2>
          <p style={styles.subtitle}>Confirma antes de recibir el archivo</p>
        </div>

        <div style={styles.content}>
          <div style={styles.contentRow}>
            <span style={styles.label}>Desde</span>
            <span style={styles.valueAlias}>{transfer.alias}</span>
          </div>
          <div style={{ ...styles.contentRow, ...styles.contentRowLast }}>
            <div>
              <div style={styles.label}>Archivo</div>
              <span style={styles.fileIcon}>{getFileIcon(transfer.file.name)}</span>
              <div style={styles.fileName}>{transfer.file.name}</div>
              <div style={styles.fileSize}>{formatBytes(transfer.file.size)}</div>
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button
            style={{ ...styles.button, ...styles.rejectBtn, ...(rejectHover && styles.rejectBtnHover) }}
            onClick={() => onReject()}
            onMouseEnter={() => setRejectHover(true)}
            onMouseLeave={() => setRejectHover(false)}
            disabled={isLoading}
          >
            Rechazar
          </button>
          <button
            style={{ ...styles.button, ...styles.acceptBtn, ...(acceptHover && styles.acceptBtnHover), opacity: isLoading ? 0.6 : 1 }}
            onClick={onAccept}
            onMouseEnter={() => setAcceptHover(true)}
            onMouseLeave={() => setAcceptHover(false)}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Aceptando...' : 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    maxWidth: '500px',
    width: '90%',
    padding: '32px',
    animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0D1117',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
  },
  content: {
    marginBottom: '28px',
    padding: '16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
  },
  contentRow: {
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentRowLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  valueAlias: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#00C896',
  },
  fileIcon: {
    fontSize: '32px',
    marginRight: '12px',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '4px',
  },
  fileName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0D1117',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  fileSize: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  button: {
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  rejectBtn: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  rejectBtnHover: {
    backgroundColor: '#E5E7EB',
    color: '#0D1117',
  },
  acceptBtn: {
    backgroundColor: '#00C896',
    color: '#FFFFFF',
  },
  acceptBtnHover: {
    backgroundColor: '#00A07A',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 200, 150, 0.3)',
  },
};
