import React, { useRef, useState } from 'react';

interface Props {
  onFileDrop: (files: File[]) => void;
}

const styles = {
  container: {
    position: 'relative' as const,
    backgroundColor: '#FFFFFF',
    border: '2px dashed #E8EDF2',
    borderRadius: '16px',
    padding: '48px 24px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden' as const,
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
  },
  containerDragging: {
    borderColor: '#00C896',
    backgroundColor: 'rgba(0, 200, 150, 0.08)',
    boxShadow: '0 0 0 8px rgba(0, 200, 150, 0.1)',
  },
  overlay: {
    position: 'absolute' as const,
    inset: 0,
    background: 'linear-gradient(135deg, rgba(0, 200, 150, 0.05) 0%, transparent 100%)',
    opacity: 0,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    pointerEvents: 'none' as const,
  },
  overlayDragging: {
    opacity: 1,
  },
  content: {
    position: 'relative' as const,
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
  },
  icon: {
    fontSize: '48px',
    animation: 'float 3s ease-in-out infinite',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0D1117',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
  },
  button: {
    marginTop: '8px',
    padding: '10px 24px',
    backgroundColor: '#00C896',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  buttonHover: {
    backgroundColor: '#00A07A',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 200, 150, 0.3)',
  },
};

export function DropZone({ onFileDrop }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [buttonHover, setButtonHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    onFileDrop(files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFileDrop(files);
    }
  };

  return (
    <>
      <div
        style={{
          ...styles.container,
          ...(isDragging && styles.containerDragging),
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        <div style={{ ...styles.overlay, ...(isDragging && styles.overlayDragging) }} />

        <div style={styles.content}>
          <div style={styles.icon}>📁</div>
          <h2 style={styles.title}>
            {isDragging ? 'Suelta el archivo aquí' : 'Arrastra un archivo'}
          </h2>
          <p style={styles.subtitle}>
            {isDragging ? 'Soltaré automáticamente' : 'O haz clic para seleccionar'}
          </p>
          <button
            style={{ ...styles.button, ...(buttonHover && styles.buttonHover) }}
            onClick={() => inputRef.current?.click()}
            onMouseEnter={() => setButtonHover(true)}
            onMouseLeave={() => setButtonHover(false)}
          >
            Seleccionar archivo
          </button>
        </div>
      </div>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-scale {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}