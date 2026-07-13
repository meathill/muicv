import { getCloudflareContext } from '@opennextjs/cloudflare';
import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { drizzle } from 'drizzle-orm/d1';

import * as schema from './schema';

/**
 * Better Auth 实例 —— 在 OpenNext / Cloudflare Workers 下做了三件事：
 *
 * 1. 通过 `getCloudflareContext({ async: true })` 拿到 Worker env（含 D1 binding）
 * 2. 用 Drizzle D1 driver 包出 db，再喂给 Better Auth Drizzle adapter
 * 3. 模块级 memoize 一份实例，避免重复初始化 Drizzle 客户端
 *
 * 注意：cookieCache 暂时不开（Better Auth issue #4203）；secondaryStorage 也不用，
 * 等到 dashboard 真正出现性能问题再加 KV cache。
 */

type Auth = ReturnType<typeof betterAuth>;
let authInstance: Auth | undefined;

export async function getAuth(): Promise<Auth> {
  if (authInstance) return authInstance;

  const { env } = await getCloudflareContext({ async: true });
  const db = drizzle(env.MUICV_DB);

  // 单独抽出 options 并标 BetterAuthOptions 类型，让 betterAuth 的泛型推断
  // 落到统一的 BetterAuthOptions 上 —— 否则 inline 调用时 TypeScript 会从
  // 字面量推断出更窄的类型，和 Better Auth 内部 PluginContext<BetterAuthOptions>
  // 不兼容（Drizzle adapter 的 generic 也跟着炸）。
  const options: BetterAuthOptions = {
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'https://muicv.com',
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      // MVP：注册即视为已登录，不强制邮箱验证
      autoSignIn: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
    },
    // 社会化登录 —— 只在配齐两份 secret 时启用，否则保持只走邮箱密码。
    // GitHub callback URL: ${BETTER_AUTH_URL}/api/auth/callback/github
    socialProviders:
      process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
              clientSecret: env.GITHUB_CLIENT_SECRET,
            },
          }
        : undefined,
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 天
      updateAge: 60 * 60 * 24, // 1 天
    },
    plugins: [
      // 让 server actions 内 setCookie 工作（必备）
      nextCookies(),
    ],
  };

  authInstance = betterAuth(options);

  return authInstance;
}
