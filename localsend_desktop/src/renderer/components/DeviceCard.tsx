type Props = { alias: string; ip: string };

export default function DeviceCard({ alias, ip }: Props) {
  return (
    <article>
      <strong>{alias}</strong>
      <p>{ip}</p>
    </article>
  );
}
