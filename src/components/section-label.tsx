export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
      {children}
    </p>
  );
}
