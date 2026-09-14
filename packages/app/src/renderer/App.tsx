import { useEffect } from 'react';

import { AppShell } from './components/app-shell';
import { AppSkeleton } from './components/app-skeleton';
import { ExtensionBridgeHost } from './components/extension-bridge-host';
import { LoginView } from './components/login-view';
import { ToastContainer } from './components/toast-container';
import { bootstrap, useAppStore } from './lib/store';

export function App() {
  const view = useAppStore((s) => s.view);
  const bootstrapping = useAppStore((s) => s.bootstrapping);

  useEffect(() => {
    void bootstrap();
  }, []);

  if (bootstrapping) {
    return (
      <>
        <AppSkeleton />
        <ToastContainer />
        <ExtensionBridgeHost />
      </>
    );
  }

  if (view === 'login') {
    // 登录页保留原来的全屏卡片布局，不套 AppShell（没 session 没法显示左栏）
    return (
      <div className="flex h-screen flex-col bg-cream">
        <LoginView />
        <ToastContainer />
        <ExtensionBridgeHost />
      </div>
    );
  }

  return (
    <>
      <AppShell />
      <ToastContainer />
      <ExtensionBridgeHost />
    </>
  );
}
