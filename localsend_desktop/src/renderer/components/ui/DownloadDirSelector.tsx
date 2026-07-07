import { useState, useEffect } from "react";

export function DownloadDirSelector() {
  const [dir, setDir] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.electronAPI.getConfig().then((config) => {
      setDir(config.downloadDir);
    });
  }, []);

  const handleSelect = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.selectDownloadDir();
      if (result.success && result.path) {
        setDir(result.path);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Carpeta de descargas</h3>
      <p style={styles.path} title={dir ?? ""}>
        {dir ?? "Predeterminada (./downloads)"}
      </p>
      <button style={styles.button} onClick={handleSelect} disabled={loading}>
        {loading ? "Abriendo..." : "Cambiar carpeta"}
      </button>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E8EDF2",
    borderRadius: "12px",
    padding: "16px",
  },
  title: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#6B7280",
    marginBottom: "8px",
  },
  path: {
    fontSize: "12px",
    color: "#0D1117",
    fontFamily: "monospace",
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis",
    marginBottom: "12px",
  },
  button: {
    width: "100%",
    padding: "8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#0D1117",
    backgroundColor: "#F3F4F6",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
};
