import type { ReactNode } from 'react';

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mb-10 rounded-xl border-2 border-rule bg-paper/60 p-5 text-[16px] leading-[1.8] text-ink-soft">
      {children}
    </p>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-12 mb-4 text-[20px] font-extrabold leading-snug tracking-tight text-ink first:mt-0">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-7 mb-3 text-[18px] font-bold text-ink">{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-[16px] leading-[1.8] text-ink-soft">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="mb-4 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-ink-soft">{children}</ul>;
}

export function Li({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}
