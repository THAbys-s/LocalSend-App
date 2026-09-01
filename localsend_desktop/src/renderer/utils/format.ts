export function formatBytes(bytes: number): string {
  const safeBytes = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (!safeBytes) return "0 B";
  const k = 1000;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(safeBytes) / Math.log(k)),
    sizes.length - 1,
  );
  return `${(safeBytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatSpeed(bps: number): string {
  const safeBps = Number.isFinite(bps) && bps > 0 ? bps : 0;
  return formatBytes(safeBps) + "/s";
}

export function formatTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  if (safeSeconds < 60) return `${Math.round(safeSeconds)}s`;
  return `${Math.floor(safeSeconds / 60)}m ${Math.round(safeSeconds % 60)}s`;
}
