export function FooterCol({ label, links }: { label: string; links: [string, string][] }) {
  return (
    <div>
      <p className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-yellow-deep">{label}</p>
      <ul className="mt-4 space-y-2">
        {links.map(([name, href]) => (
          <li key={name}>
            <a
              href={href}
              className="text-ink-soft underline decoration-rule decoration-2 underline-offset-4 transition hover:text-ink hover:decoration-yellow"
            >
              {name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
