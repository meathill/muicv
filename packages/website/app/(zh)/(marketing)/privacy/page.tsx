import type { Metadata } from 'next';

import { H2, H3, Lead, Li, P, UL } from '../_legal-typography';
import { soloPageMetadata } from '../_page-meta';
import { Footer } from '../_sections/footer';
import { Header } from '../_sections/header';

export const metadata: Metadata = soloPageMetadata({
  path: '/privacy',
  title: '隐私政策',
  description: 'Mui简历隐私政策——我们收集什么、怎么用、你有什么权利。',
});

export const revalidate = 3600;

const EFFECTIVE_DATE = '2026-04-30';

export default function PrivacyPage() {
  return (
    <div className="relative">
      <Header />

      <section className="relative overflow-hidden border-b border-rule">
        <div className="absolute inset-0 bg-sun" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 法律</p>
          <h1 className="mt-3 text-[clamp(2.25rem,5vw,3.5rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
            隐私政策
          </h1>
          <p className="mt-5 font-mono text-[12px] uppercase tracking-wider text-mute">
            生效日期：{EFFECTIVE_DATE} · 上次更新：{EFFECTIVE_DATE}
          </p>
        </div>
      </section>

      <article className="border-b border-rule">
        <div className="prose-legal mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
          <Lead>
            Mui简历（"我们"、"本服务"）尊重你的隐私，并承诺以最小必要原则收集、使用、存储信息。本政策说明我们如何处理与你相关的数据，
            以及你享有的权利。使用本服务即表示你已阅读并理解本政策。
          </Lead>

          <H2>1. 适用范围</H2>
          <P>
            本政策适用于 muicv.com 网站、Mui简历桌面应用、相关 API 服务，以及通过 AI agent 接入的 skill 套件。
            第三方网站或服务（即便从我们的页面跳转）不在本政策范围内，请单独参阅其隐私政策。
          </P>

          <H2>2. 我们收集的信息</H2>
          <H3>2.1 你主动提供的信息</H3>
          <UL>
            <Li>
              <strong>账户信息</strong>：注册时的邮箱、用户名；通过第三方登录时来自服务商（如 Google）的基本身份信息。
            </Li>
            <Li>
              <strong>简历素材</strong>：你写在本地 Markdown 文件中的工作经历、项目、技能、教育等内容。
              <strong>这些内容默认存在你自己的电脑或项目目录中，我们不会将其上传到服务器。</strong>
            </Li>
            <Li>
              <strong>支付信息</strong>：付费档位下的支付凭证（不含完整卡号，由第三方支付服务商处理）。
            </Li>
            <Li>
              <strong>沟通内容</strong>：你通过邮件、客服等渠道发给我们的内容。
            </Li>
          </UL>

          <H3>2.2 自动收集的信息</H3>
          <UL>
            <Li>
              <strong>使用日志</strong>：API 调用记录、错误日志、使用时长、功能调用频次（用于改进产品和排查问题）。
            </Li>
            <Li>
              <strong>设备与网络信息</strong>：IP 地址、浏览器/客户端版本、操作系统类型，用于安全审计与服务可用性。
            </Li>
            <Li>
              <strong>Cookie 与类似技术</strong>：登录状态、偏好设置等。详见下文 §6。
            </Li>
          </UL>

          <H3>2.3 你调用云端能力时的临时数据</H3>
          <P>
            当你主动调用 PDF 渲染、岗位抓取、LLM 生成等服务端能力时，相关内容会通过我们的服务器短暂转发处理。
            <strong>处理完即丢弃</strong>，我们不会持久化保存这些内容。详见下文 §4。
          </P>

          <H2>3. 我们如何使用信息</H2>
          <UL>
            <Li>提供你请求的服务（生成简历、抓取岗位、导出 PDF 等）；</Li>
            <Li>维护账户、处理订阅与计费、发送服务通知；</Li>
            <Li>改进产品（基于聚合的、不可识别个人的使用数据）；</Li>
            <Li>保障安全，识别与防止滥用、欺诈、违规行为；</Li>
            <Li>在你订阅 Waitlist 或勾选邮件订阅后，发送产品更新与发布通知；你可以随时退订。</Li>
          </UL>

          <H2>4. 数据存储位置</H2>
          <P>
            <strong>本地优先</strong>是我们的核心原则。你的简历素材以纯 Markdown 文件形式存放在你自己电脑或项目目录中，
            我们不强制上传，也不在云端建立"简历库"。你完全控制这些数据要不要入版本控制、要不要备份、要不要分享。
          </P>
          <P>
            服务端数据（账户信息、订阅记录、使用日志）存储在受信任的云服务商（如 Cloudflare）的数据中心，
            按行业标准加密传输与存储。临时通过服务器处理的内容（PDF 渲染、岗位抓取等）处理完成后立即丢弃，不持久化。
          </P>

          <H2>5. 第三方服务</H2>
          <P>为了向你提供完整功能，我们使用以下类型的第三方服务，按最小必要原则共享数据：</P>
          <UL>
            <Li>
              <strong>云基础设施</strong>：Cloudflare（服务器与边缘网络）。
            </Li>
            <Li>
              <strong>大语言模型</strong>：在你使用 AI 生成、分析能力时，请求会路由到对应的 LLM 服务商（如
              Anthropic、OpenAI 等）。 如果你启用了 BYOK，调用走你自己的账户，我们不再经手。
            </Li>
            <Li>
              <strong>身份认证</strong>：基于 better-auth 实现的认证服务；可选第三方登录（如 Google）。
            </Li>
            <Li>
              <strong>支付处理</strong>：付费档位通过第三方支付服务商完成，我们不接触你的完整卡号信息。
            </Li>
            <Li>
              <strong>站点分析</strong>：我们使用 Google Analytics 4（gtag.js）做匿名站点分析，
              统计页面访问、来源、停留时长等聚合指标，并采集 LCP / CLS / INP 等 Web Vitals 性能指标。 我们开启 IP
              匿名化，不上传可识别个人的内容。
            </Li>
          </UL>
          <P>上述服务商均有自己的隐私政策与合规义务。我们会持续审核合作方，确保数据处理符合本政策与适用法律。</P>

          <H2>6. Cookie 与类似技术</H2>
          <P>我们使用以下几类 Cookie / 本地存储：</P>
          <UL>
            <Li>
              <strong>必要 Cookie</strong>：维持登录状态、记录主题与语言等用户偏好。
            </Li>
            <Li>
              <strong>分析 Cookie</strong>：Google Analytics 4 写入的 <code>_ga</code>、<code>_ga_*</code> 等 Cookie，
              用于区分访客、聚合访问数据。这些 Cookie 已开启 IP 匿名化，不与你的账户信息关联，也不用于跨站追踪或广告。
            </Li>
          </UL>
          <P>
            我们不使用追踪类广告 Cookie。你可以通过浏览器设置禁用或清除
            Cookie，但这可能导致部分功能（如保持登录）无法正常工作。
          </P>

          <H2>7. 你的权利</H2>
          <P>关于我们处理的与你相关的个人信息，你享有以下权利：</P>
          <UL>
            <Li>
              <strong>访问</strong>：要求查看我们持有的与你相关的数据；
            </Li>
            <Li>
              <strong>更正</strong>：要求更正不准确或不完整的数据；
            </Li>
            <Li>
              <strong>删除</strong>：在不违反法律保留义务的前提下，要求删除与你相关的数据；
            </Li>
            <Li>
              <strong>导出</strong>：以结构化、机器可读的格式导出你的数据；
            </Li>
            <Li>
              <strong>撤回同意</strong>：对基于你同意而进行的处理活动，可以随时撤回（如邮件订阅）；
            </Li>
            <Li>
              <strong>反对与限制</strong>：在适用法律允许的范围内，反对特定处理或要求限制处理。
            </Li>
          </UL>
          <P>
            行使上述权利请发邮件至{' '}
            <a
              href="mailto:hi@muicv.com"
              className="font-semibold text-yellow-deep underline decoration-corgi decoration-2 underline-offset-4 hover:decoration-yellow"
            >
              hi@muicv.com
            </a>
            。我们一般在 30 天内回复。
          </P>

          <H2>8. 数据保留期</H2>
          <P>
            账户数据在账户存续期间保留；账户注销后，除法律要求保留的内容（如计费凭证）外，30
            天内从生产系统中删除，备份按既定周期循环覆盖。 日志类数据按业务需要保留 90 天至 1 年不等，到期后自动清理。
          </P>

          <H2>9. 国际数据传输</H2>
          <P>
            我们使用的部分基础设施可能位于多个国家或地区。在跨境传输数据时，我们采取合同条款、数据加密等措施，
            确保数据保护水平不低于本政策与适用法律的要求。
          </P>

          <H2>10. 儿童隐私</H2>
          <P>
            本服务面向 14 岁及以上用户。如果你未满 14 岁，请勿使用本服务，也请勿向我们提供任何个人信息。
            我们一旦发现误收集了未成年人信息，会立即删除。
          </P>

          <H2>11. 政策更新</H2>
          <P>
            我们可能会不时更新本政策。重大变更会通过站内通知或邮件告知。继续使用本服务即表示接受更新后的政策。
            我们建议你定期查看本页以了解最新内容。
          </P>

          <H2>12. 联系我们</H2>
          <P>
            对本政策有任何疑问、投诉或行使你的权利，请发邮件至{' '}
            <a
              href="mailto:hi@muicv.com"
              className="font-semibold text-yellow-deep underline decoration-corgi decoration-2 underline-offset-4 hover:decoration-yellow"
            >
              hi@muicv.com
            </a>
            。
          </P>
        </div>
      </article>

      <Footer />
    </div>
  );
}
