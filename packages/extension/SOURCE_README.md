# Mui Resume browser extension — source code for review

This archive contains everything needed to reproduce `muicv-extension-0.3.0-firefox.zip`
(and the Chrome/Edge `muicv-extension-0.3.0.zip`) byte-for-byte in content.

Contents: a trimmed pnpm monorepo with `packages/extension` (the add-on) and
`packages/shared` (TypeScript library it imports), the root `package.json`,
`pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.base.json` and `biome.json`.
Store marketing assets were left out; they are not part of the build.

## Requirements

- Linux or macOS (tested on Linux x64)
- Node.js 24.8.0 (any Node >= 22 works)
- pnpm 10.33.2 (`corepack enable && corepack prepare pnpm@10.33.2 --activate`, or `npm i -g pnpm@10.33.2`)

## Build

```sh
unzip muicv-extension-0.3.0-source.zip -d muicv-src
cd muicv-src
pnpm install --frozen-lockfile
pnpm --filter @muicv/extension release
```

Output:

- `packages/extension/release/muicv-extension-0.3.0-firefox.zip` — Firefox (AMO)
- `packages/extension/release/muicv-extension-0.3.0.zip` — Chrome / Edge
- `packages/extension/dist/` — the unpacked build

The build script is `packages/extension/scripts/build.ts` (run with Node's built-in TypeScript
support). It bundles `src/popup.ts` and `src/inject.ts` with Vite/Rolldown, copies `public/`
(manifest, popup.html, icons), generates `_locales/*/messages.json` from `locales/*.json`,
and for Firefox adds `browser_specific_settings` to the manifest. No remote code is fetched or
executed at runtime.
