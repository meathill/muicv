import type { ConnectTarget } from '@/lib/connect-redirect';

/** /connect 与 /en/connect 共用的授权页文案。 */

export type ConnectLang = 'zh' | 'en';

export type ConnectCopy = {
  eyebrow: string;
  title: string;
  body: string;
  account: string;
  accountFallback: string;
  connectTo: string;
  footer: string;
  invalidTitle: string;
  invalidBody: string;
  approve: string;
  busy: string;
  cancel: string;
  failed: string;
  doneTitle: string;
  doneBody: string;
  reopen: string;
  troubleTitle: string;
  troubleBody: string;
  copy: string;
  copied: string;
  keyName: (app: string) => string;
};

const ZH: Record<ConnectTarget, ConnectCopy> = {
  desktop: {
    eyebrow: '连接确认',
    title: '登录到 Mui简历桌面端',
    body: '确认后，浏览器会自动打开桌面 app。回到 app 继续整理简历就好。',
    account: '当前账号',
    accountFallback: '已登录账号',
    connectTo: '连接到',
    footer: '看着不对？关闭这个窗口，就不会完成连接。',
    invalidTitle: '登录请求已失效',
    invalidBody: '请回到桌面 app，重新点一次登录。',
    approve: '连接并打开桌面 app',
    busy: '正在连接…',
    cancel: '取消连接',
    failed: '授权失败',
    doneTitle: '已连接',
    doneBody: '如果桌面 app 已经打开，可以直接回去继续。没反应的话，再点一次。',
    reopen: '打开桌面 app',
    troubleTitle: '桌面 app 没反应？',
    troubleBody: '少数浏览器会拦截自动打开。复制备用登录码，回到桌面 app 的手动登录里粘贴。',
    copy: '复制备用登录码',
    copied: '已复制备用登录码',
    keyName: (app) => `桌面端 ${app}`,
  },
  extension: {
    eyebrow: '连接确认',
    title: '登录到 Mui简历浏览器扩展',
    body: '确认后，扩展会自动登录到这个账号，这个窗口会自动关闭。',
    account: '当前账号',
    accountFallback: '已登录账号',
    connectTo: '连接到',
    footer: '看着不对？关闭这个窗口，就不会完成连接。',
    invalidTitle: '登录请求已失效',
    invalidBody: '请回到扩展，重新点一次登录。',
    approve: '允许并登录扩展',
    busy: '正在连接…',
    cancel: '取消连接',
    failed: '授权失败',
    doneTitle: '已连接',
    doneBody: '扩展已登录，可以关闭这个窗口了。',
    reopen: '',
    troubleTitle: '',
    troubleBody: '',
    copy: '',
    copied: '',
    keyName: (app) => `浏览器扩展 ${app}`,
  },
};

const EN: Record<ConnectTarget, ConnectCopy> = {
  desktop: {
    ...ZH.desktop,
    eyebrow: 'Confirm connection',
    title: 'Sign in to the MuiCV desktop app',
    body: 'After you confirm, your browser opens the desktop app. Head back there to keep working on your resume.',
    account: 'Account',
    accountFallback: 'Signed-in account',
    connectTo: 'Connect to',
    footer: "Doesn't look right? Close this window and nothing will be connected.",
    invalidTitle: 'This sign-in request has expired',
    invalidBody: 'Go back to the desktop app and click sign in again.',
    approve: 'Connect and open the desktop app',
    busy: 'Connecting…',
    cancel: 'Cancel',
    failed: 'Authorization failed',
    doneTitle: 'Connected',
    doneBody: 'If the desktop app is already open, just go back to it. If nothing happened, click again.',
    reopen: 'Open the desktop app',
    troubleTitle: 'Desktop app not responding?',
    troubleBody:
      "Some browsers block opening apps. Copy the backup sign-in code and paste it into the desktop app's manual sign-in.",
    copy: 'Copy backup sign-in code',
    copied: 'Backup sign-in code copied',
  },
  extension: {
    ...ZH.extension,
    eyebrow: 'Confirm connection',
    title: 'Sign in to the MuiCV browser extension',
    body: 'After you confirm, the extension signs in to this account and this window closes by itself.',
    account: 'Account',
    accountFallback: 'Signed-in account',
    connectTo: 'Connect to',
    footer: "Doesn't look right? Close this window and nothing will be connected.",
    invalidTitle: 'This sign-in request has expired',
    invalidBody: 'Go back to the extension and click sign in again.',
    approve: 'Allow and sign in',
    busy: 'Connecting…',
    cancel: 'Cancel',
    failed: 'Authorization failed',
    doneTitle: 'Connected',
    doneBody: 'The extension is signed in. You can close this window.',
  },
};

export function connectCopy(lang: ConnectLang, target: ConnectTarget): ConnectCopy {
  return (lang === 'en' ? EN : ZH)[target];
}
