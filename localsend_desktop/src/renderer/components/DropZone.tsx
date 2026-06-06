type Props = { onDrop: (files: FileList) => void };

export default function DropZone({ onDrop }: Props) {
  return (
    <div onDrop={(event) => { event.preventDefault(); onDrop(event.dataTransfer.files); }} onDragOver={(event) => event.preventDefault()}>
      Arrastra archivos aquí
    </div>
  );
}
