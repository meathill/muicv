/** 静态资源模块声明（electron-vite / Vite 在构建时处理这些 import）。 */
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.css';
