import type { ReactNode } from 'react';

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-fluff px-1.5 py-0.5 font-mono text-[0.86em] text-yellow-deep ring-1 ring-corgi/40">
      {children}
    </code>
  );
}

export function PawIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <ellipse cx="6" cy="9" rx="1.8" ry="2.4" fill="currentColor" />
      <ellipse cx="10.5" cy="6" rx="1.8" ry="2.4" fill="currentColor" />
      <ellipse cx="13.5" cy="6" rx="1.8" ry="2.4" fill="currentColor" />
      <ellipse cx="18" cy="9" rx="1.8" ry="2.4" fill="currentColor" />
      <path
        d="M12 11c-3 0-5 2.5-5 5 0 1.8 1.5 3 3.2 3 0.8 0 1.2-.4 1.8-.4s1 .4 1.8.4c1.7 0 3.2-1.2 3.2-3 0-2.5-2-5-5-5z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 wiggle" aria-hidden>
      <path d="M12 2 L13.6 9.4 L21 12 L13.6 14.6 L12 22 L10.4 14.6 L3 12 L10.4 9.4 Z" fill="currentColor" />
    </svg>
  );
}

export function ArrowDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M12 4v16m0 0l-6-6m6 6l6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M7 17L17 7M17 7H8M17 7v9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 荧光笔式块状高亮 —— 卡通氛围下用来强调。 */
export function Highlight({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span
        className="absolute inset-x-[-2px] bottom-[6%] -z-10 h-[42%] -skew-y-1 rounded-sm bg-corgi/80"
        aria-hidden
      />
      <span className="relative">{children}</span>
    </span>
  );
}

/** Feature 卡片用的轻量图标。沿用项目自绘风格，不引入第三方图标库。 */
type IconProps = { className?: string };
const ICON_BASE = 'h-5 w-5';

export function DocIcon({ className = ICON_BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TargetIcon({ className = ICON_BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function ChatIcon({ className = ICON_BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 5h16v11H8l-4 4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CompassIcon({ className = ICON_BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="m15 9-2 5-5 2 2-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function RocketIcon({ className = ICON_BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M14 4s5 2 5 7c0 4-3 5-3 5l-2 2-5-5 2-2s1-3 5-3 3-4 3-4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="m9 15-3 3M11 17l-2 2M7 13l-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
