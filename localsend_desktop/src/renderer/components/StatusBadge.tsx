type Props = { status: 'online' | 'offline'; label: string };

export default function StatusBadge({ status, label }: Props) {
  return <span>{status === 'online' ? '🟢' : '🔴'} {label}</span>;
}
