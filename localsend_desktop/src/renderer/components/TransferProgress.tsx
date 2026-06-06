type Props = { percent: number; speed: string; eta: string };

export default function TransferProgress({ percent, speed, eta }: Props) {
  return (
    <section>
      <progress value={percent} max={100} />
      <div>{percent}%</div>
      <div>{speed} · {eta}</div>
    </section>
  );
}
