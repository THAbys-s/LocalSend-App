type Props = { onReplace: () => void; onKeepBoth: () => void; onSkip: () => void };

export default function CollisionDialog({ onReplace, onKeepBoth, onSkip }: Props) {
  return (
    <dialog open>
      <p>Conflicto de archivos</p>
      <button onClick={onReplace}>Reemplazar</button>
      <button onClick={onKeepBoth}>Mantener ambos</button>
      <button onClick={onSkip}>Omitir</button>
    </dialog>
  );
}
