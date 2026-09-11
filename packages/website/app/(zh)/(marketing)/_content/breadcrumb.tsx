import Link from 'next/link';

export type BreadcrumbItem = { name: string; href?: string };

/**
 * 可见面包屑。与页面的 BreadcrumbList JSON-LD 层级保持一致：
 * 末项为当前页（不可点 + aria-current），中间项可点，过长标题自动截断。
 */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="面包屑">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-mute">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.name}-${index}`} className="flex min-w-0 items-center gap-x-2">
              {index > 0 && (
                <span aria-hidden className="text-rule-strong">
                  /
                </span>
              )}
              {isLast || !item.href ? (
                <span aria-current={isLast ? 'page' : undefined} className="truncate text-ink-soft">
                  {item.name}
                </span>
              ) : (
                <Link href={item.href} className="shrink-0 font-bold text-yellow-deep hover:text-ink">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
