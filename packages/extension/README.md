# Mui简历 浏览器扩展

把任意网页上的招聘信息提交到 Mui简历岗位库：公共岗位池（识别到岗位免费，新岗位有奖励）或私藏（只自己可见，按实际 AI 用量计费）。

## 开发

```bash
pnpm --filter @muicv/extension install
pnpm --filter @muicv/extension test
pnpm --filter @muicv/extension build
```

Chrome / Edge：`chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选 `packages/extension/dist`。

首次打开 popup 需填入 muicv API key（在 muicv.com/dashboard 生成），只保存在本机浏览器。

权限：`storage` / `activeTab` / `scripting`。只在点开 popup 时读取当前页，上传正文 markdown、标题、URL、JobPosting JSON-LD 和外链列表，不上传整页 HTML。

预览 popup（无需加载扩展）：构建后用浏览器打开 `dist/popup.html?state=ready|submitting|result|error|key`。
