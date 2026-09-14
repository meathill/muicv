# Mui简历 浏览器扩展

把当前招聘页的 JD 发给桌面端，判断是否适合投；合适则生成针对性简历。也可把 JD 贡献到社区岗位库。

## 开发

```bash
pnpm --filter @muicv/extension install
pnpm --filter @muicv/extension test
pnpm --filter @muicv/extension build
```

Chrome / Edge：`chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选 `packages/extension/dist`。

使用前请先打开 Mui简历桌面端，首次会弹出「允许连接」。
