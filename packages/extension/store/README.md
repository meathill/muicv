# 商店上架资料（Chrome Web Store / Edge Add-ons / Firefox AMO）

- 打包：`pnpm --filter @muicv/extension release` 会生成
  - `release/muicv-extension-0.3.1.zip`（Chrome / Edge）
  - `release/muicv-extension-0.3.1-firefox.zip`（AMO）
- 素材：先跑 `pnpm build`，再跑 `pnpm store:assets`，输出到 `store/assets/<locale>/`
- 商店文案：`store/<locale>/listing.md`，共 9 个语言：en、zh_CN、ja、de、fr、es、pt_BR、th、vi，和网站支持的语言一致
- 隐私政策：https://muicv.com/privacy/extension

## Privacy practices（CWS 表单只有英文，直接粘贴）

**Single purpose**
Mui Resume lets a signed-in muicv user save job postings from the page they are currently viewing into their muicv job pool (public or private), so they can search, match and apply from muicv.

**Permission justifications**
- `activeTab`: only when the user clicks the toolbar button, to read the current tab's URL and title and decide whether the page contains job postings. There is no access to any other tab and no background access.
- `scripting`: injects a one-shot script into the active tab after the user's click. It reads the page's structured job data (JSON-LD) and its readable text, which are then sent to the muicv API for extraction.
- `storage`: stores the user's muicv API key and the ids of pending submissions locally, so that a result can still be shown after the popup is reopened.
- Host permissions: none. Remote code: none. All code ships in the package.

**Data usage disclosures** (check these)
- *Authentication information*: the muicv API key the user pastes in.
- *Website content*: the URL, title and text of the page the user explicitly submits.
- Do not check: personally identifiable info, health, financial, personal communications, location, web history, user activity.
- Certify all three statements: data is not sold to third parties; it is not used or transferred for purposes unrelated to the single purpose; it is not used for creditworthiness or lending.

## Submission checklist

### Chrome Web Store
- [ ] Developer account: https://chrome.google.com/webstore/devconsole. New accounts pay a one-time **US$5** fee and must verify their email. Trader / non-trader declaration: choose trader if this is offered commercially (needs an address and phone number).
- [ ] Upload `release/muicv-extension-0.3.1.zip`.
- [ ] Listing per language: paste the name, short description and detailed description from `store/<locale>/listing.md`.
  - Category: Productivity / Tools.
  - Language: default English.
- [ ] Graphic assets for each language, from `store/assets/<locale>/`:
  - icon `store/assets/icon-128.png`
  - 5 screenshots at 1280×800
  - small promo tile 440×280
  - marquee 1400×560
- [ ] Privacy tab: paste the section above and set the privacy policy URL.
- [ ] Distribution: Public, all regions.
- [ ] Submit for review. Typical review time is 1–3 days.
- [ ] Test account notes for reviewers: they need a muicv account with an API key. Provide a test key in "Notes for reviewer" (create it in the dashboard; it can be revoked afterwards).

### Microsoft Edge Add-ons
- [ ] Partner Center: https://partner.microsoft.com/dashboard/microsoftedge. Free to register; needs a Microsoft account.
- [ ] Upload the same Chrome zip. Edge accepts the same assets: 1280×800 screenshots, 440×280 small tile and 1400×560 large tile.
- [ ] Privacy policy URL, the same listing copy, and test notes.

### Firefox AMO
- [ ] https://addons.mozilla.org/developers/. Free; needs a Firefox account.
- [ ] Upload `release/muicv-extension-0.3.1-firefox.zip`. It includes:
  - `browser_specific_settings.gecko.id`: `extension@muicv.com`
  - `data_collection_permissions`
- [ ] Because the bundle is minified, you **must upload the source code**:
  - Upload `release/muicv-extension-0.3.1-source.zip`（建法见下方「AMO 源码包」）. Build steps are in its `SOURCE_README.md`.
- [ ] Listed on AMO, with the privacy policy URL. AMO screenshots have no fixed size, so the 1280×800 ones work.

### Before you submit
- [ ] Confirm https://muicv.com/privacy/extension is live (the website deploys automatically when pushed).
- [ ] Use the api health check to confirm `POST /jobs/submit` and `GET /jobs/submit/:id` are live.
- [ ] Install the zip unpacked, then go through the flow once on a real page: save to the public pool, save privately, close the popup while the job is queued, and reopen it to see the result.

## AMO 源码包

```sh
# 在仓库根目录
rm -rf /tmp/muicv-src && mkdir -p /tmp/muicv-src
tar --exclude=node_modules --exclude=dist --exclude=release --exclude=store --exclude=store-assets \
  -cf - packages/extension packages/shared | tar -xf - -C /tmp/muicv-src
cp pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json biome.json /tmp/muicv-src/
node -e "const p=require('./package.json');delete p.scripts.prepare;require('fs').writeFileSync('/tmp/muicv-src/package.json',JSON.stringify(p,null,2))"
cp packages/extension/SOURCE_README.md /tmp/muicv-src/
python3 -c "import shutil;shutil.make_archive('packages/extension/release/muicv-extension-0.3.1-source','zip','/tmp/muicv-src')"
```

The root `prepare` script (`git config core.hooksPath`) is removed because the archive is not a git repo.

## Notes for reviewers (paste into each store)

> 0.3.1 起扩展默认用「通过 muicv.com 登录」（identity.launchWebAuthFlow → /connect 授权页）。审核员仍可在「高级：使用 API key」里粘贴测试 key。

Use the same text for Chrome Web Store ("Notes for reviewer"/test instructions), Edge Partner Center ("Notes for certification") and Firefox AMO ("Notes to reviewer"). Replace `<TEST_API_KEY>` with a key created at https://muicv.com/en/dashboard/api-keys on a dedicated test account (with some token balance), and revoke it after review.

```text
Mui Resume saves job postings from the page you are viewing into your muicv.com job pool.
It only runs when you click the toolbar button (activeTab + scripting); there are no host
permissions, no background page access and no remote code.

Test account: a test API key is provided separately below / in this field:
  API key: <TEST_API_KEY>

Steps:
1. Install the extension and click its toolbar icon on any page.
2. The popup asks for an API key. Paste the key above and click "Save".
3. Open a public job posting, e.g. any job on https://boards.greenhouse.io/ or https://jobs.lever.co/
   (or https://remoteok.com/), and click the toolbar icon again.
4. The popup shows the page title. Keep the public option selected and click "Submit to public pool".
   Structured pages return immediately; other pages are queued for AI extraction and the
   popup shows progress (it is fine to close and reopen the popup; the result is kept).
5. The result lists the detected jobs with links to muicv.com. "Private" mode saves them
   only to the test account instead.
6. Submission history and credit changes are visible at
   https://muicv.com/en/dashboard/submissions (sign in with the test account if needed),
   and the extension links there from the result screen.

Data sent: only the URL, title, readable text and JSON-LD of the page you explicitly submit,
plus the API key for authentication. Privacy policy: https://muicv.com/privacy/extension
```
