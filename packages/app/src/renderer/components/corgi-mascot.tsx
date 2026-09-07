import muiLogo from '../public/brand/mui-logo.png';

/** Mui 柯基 mascot —— 与 packages/website 同款，本品牌精神图腾。 */
export function CorgiMascot({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center overflow-visible ${className}`} aria-hidden>
      <img src={muiLogo} className="h-full w-[155%] max-w-none object-contain" alt="" />
    </span>
  );
}
