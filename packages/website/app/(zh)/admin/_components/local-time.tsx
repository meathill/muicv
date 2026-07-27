'use client';

const FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

export function LocalTime({ ms, className }: { ms: number; className?: string }) {
  const date = new Date(ms);
  return (
    <time dateTime={date.toISOString()} className={className} suppressHydrationWarning>
      {date.toLocaleString('zh-CN', FORMAT_OPTIONS)}
    </time>
  );
}
