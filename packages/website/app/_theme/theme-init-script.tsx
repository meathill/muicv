/**
 * 在 React hydrate 前同步读 localStorage 设 data-theme，避免暗色模式
 * 闪一下浅色再切换的 FOUC。挂在 <head> 里。
 */
export function ThemeInitScript() {
  const code = `(function(){try{var t=localStorage.getItem('muicv-theme');if(t==='dark'||t==='auto'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
  // biome-ignore lint/security/noDangerouslySetInnerHtml: 常量内联脚本，hydrate 前同步设 data-theme 防暗色 FOUC
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
