/**
 * 把 t1~t6 用到的 Google Fonts 一次性 inject。
 *
 * React 19 会把 <link> 自动 hoist 到 <head>，重复 import 同一组件不会重复插入；
 * 老 default 模板自己有更轻的 Noto Sans SC link，不走这个。
 */
export default function TemplateFonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;600;700&family=Noto+Serif+SC:wght@300;400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,300;8..60,400;8..60,600;8..60,700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      />
    </>
  );
}
