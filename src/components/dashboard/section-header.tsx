export function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow?: string;
  title: string;
}) {
  return (
    <div>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300/80">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">{title}</h2>
    </div>
  );
}
