import type { Metadata } from 'next';

import { H2, Lead, Li, P, UL } from '../_legal-typography';
import { soloPageMetadata } from '../_page-meta';
import { Footer } from '../_sections/footer';
import { Header } from '../_sections/header';

export const metadata: Metadata = soloPageMetadata({
  path: '/terms',
  title: '服务条款',
  description: 'Mui简历服务条款——使用本服务前请仔细阅读。',
});

export const revalidate = 3600;

const EFFECTIVE_DATE = '2026-04-30';

export default function TermsPage() {
  return (
    <div className="relative">
      <Header />

      <section className="relative overflow-hidden border-b border-rule">
        <div className="absolute inset-0 bg-sun" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 法律</p>
          <h1 className="mt-3 text-[clamp(2.25rem,5vw,3.5rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
            服务条款
          </h1>
          <p className="mt-5 font-mono text-[12px] uppercase tracking-wider text-mute">
            生效日期：{EFFECTIVE_DATE} · 上次更新：{EFFECTIVE_DATE}
          </p>
        </div>
      </section>

      <article className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
          <Lead>
            欢迎使用 Mui简历（"本服务"、"我们"）。本条款是你与我们之间关于使用本服务的协议。
            请在使用前仔细阅读。一旦你注册账户、订阅服务、或以任何方式使用本服务，即表示你已阅读、理解并同意接受本条款。
          </Lead>

          <H2>1. 接受条款</H2>
          <P>
            本服务由 Mui简历团队提供。注册或使用本服务即视为你已年满 14 周岁，具备签订协议的相应行为能力，
            并同意接受本条款及附属的隐私政策。如果你不同意本条款，请勿使用本服务。
          </P>

          <H2>2. 服务说明</H2>
          <P>
            Mui简历提供一站式 AI 求职平台，包括但不限于：简历素材整理、岗位发现与匹配度评估、简历生成与评审、
            模拟面试、就业辅导、PDF 导出等能力。具体功能与可用性按你所在档位以及最新版本为准；
            我们保留增加、调整、暂停或停止部分功能的权利。
          </P>

          <H2>3. 账户注册与责任</H2>
          <UL>
            <Li>注册时请提供真实、准确、完整的信息，并在信息变化时及时更新。</Li>
            <Li>账户由你本人使用，你对账户的全部活动承担责任。请妥善保管登录凭证。</Li>
            <Li>不得转让、出借、出租账户，或以任何形式与他人共享账户使用权。</Li>
            <Li>发现账户被未授权使用，请立即通知我们。</Li>
          </UL>

          <H2>4. 可接受使用规则</H2>
          <P>使用本服务时，你不得：</P>
          <UL>
            <Li>违反任何适用法律、法规或第三方权利；</Li>
            <Li>上传、生成或传播违法、侵权、欺诈、诽谤、淫秽、暴力、骚扰或其他不当内容；</Li>
            <Li>冒用他人身份，伪造工作经历、教育背景、技能等信息以欺诈用人方；</Li>
            <Li>对本服务进行逆向工程、反编译、反汇编（除适用法律明确允许的情形外）；</Li>
            <Li>通过自动化手段大规模抓取本服务内容，或对服务实施攻击、超量请求、绕过限流；</Li>
            <Li>使用本服务从事违反 LLM 服务商使用政策的行为；</Li>
            <Li>未经授权，自动投递简历到第三方招聘平台，或以违反第三方平台 ToS 的方式使用本服务输出。</Li>
          </UL>
          <P>违反上述规则的，我们有权暂停或终止你的账户，且无需退款；造成损失的，你应承担相应法律责任。</P>

          <H2>5. 用户内容与许可</H2>
          <P>
            你通过本服务上传、输入或生成的简历素材、岗位信息、文档等内容（"用户内容"）所有权归你本人。
            为提供服务所必需，你授予我们一项有限的、非独占的、免费的、全球范围内的许可，
            用于存储、传输、处理、显示用户内容，<strong>仅限于为你提供本服务的目的</strong>。
          </P>
          <P>
            许可在你删除内容或注销账户后即时终止（除适用法律或本条款另有约定的情形外）。
            我们不会将你的用户内容用于训练通用 AI 模型，也不会对外出售或共享。
          </P>

          <H2>6. 关于求职建议的免责声明</H2>
          <P>
            本服务提供工具与建议，帮助你在求职过程中更高效地准备材料、整理思路、应对挑战。
            <strong>但我们不保证你使用本服务后能拿到面试、Offer 或任何特定职业结果。</strong>
            就业结果受多种因素影响（市场、岗位、面试官、个人表现等），请基于自身情况独立判断与决策。
          </P>
          <P>
            本服务输出的内容（简历、求职信、面试回答等）由 AI 辅助生成，仅作建议参考，最终内容由你确认并负责。
            你有义务核实信息真实性，并对提交给用人方的所有材料承担全部责任。
          </P>

          <H2>7. 付费、退款、订阅终止</H2>
          <UL>
            <Li>付费档位的具体价格、功能与限额以本服务定价页公布的最新内容为准。</Li>
            <Li>订阅按月或按年自动续费；可随时在控制台中关闭自动续费，已支付费用按订阅周期计算。</Li>
            <Li>新用户首次订阅在 7 天内未消耗主要付费功能的，可申请全额退款；具体细则与例外情形以退款政策为准。</Li>
            <Li>因违反本条款被终止账户的，已支付费用不予退还。</Li>
            <Li>价格调整将提前通过站内通知或邮件告知；调价生效前你可以选择不再续费。</Li>
          </UL>

          <H2>8. 知识产权</H2>
          <P>
            本服务及其相关组件（包括但不限于代码、设计、文案、品牌标识）的知识产权归我们所有，受适用法律保护。
            未经书面许可，不得复制、修改、分发或用于商业目的。
          </P>
          <P>Skill 套件部分按其各自的开源许可证提供，具体以套件中的许可证文件为准。</P>

          <H2>9. 第三方服务</H2>
          <P>
            本服务集成了第三方组件（如云基础设施、LLM 服务、支付服务等）。这些第三方服务有各自的服务条款与隐私政策，
            使用对应功能即表示你同时接受相关第三方条款。我们对第三方服务的可用性与表现不承担直接责任。
          </P>

          <H2>10. 服务变更与中止</H2>
          <P>
            我们保留随时变更、暂停或终止本服务（或其中任一部分）的权利。重大变更会提前通知；
            因维护、升级、故障或不可抗力导致的临时中断，我们将尽合理努力恢复服务，但不就此承担违约责任。
          </P>

          <H2>11. 责任限制</H2>
          <P>在适用法律允许的最大范围内：</P>
          <UL>
            <Li>本服务按"现状"和"可用"的基础提供，不对适销性、特定用途适用性、不侵权等作出任何明示或暗示的保证；</Li>
            <Li>
              因使用或无法使用本服务、AI
              输出失误、第三方服务故障等产生的任何间接、附带、特殊或后果性损失（包括但不限于错失工作机会、收入损失），我们不承担责任；
            </Li>
            <Li>
              我们对你的累计赔偿责任，不超过你在事件发生前 12 个月内向我们实际支付的服务费总额，或人民币 100
              元（以较高者为准）。
            </Li>
          </UL>

          <H2>12. 适用法律与争议解决</H2>
          <P>
            本条款的订立、效力、解释、履行与争议解决均适用中华人民共和国法律（不含冲突法规则）。
            因本条款引发的或与之相关的任何争议，双方应首先友好协商解决；协商不成的，提交至我们运营主体所在地有管辖权的人民法院诉讼解决。
          </P>

          <H2>13. 条款变更</H2>
          <P>
            我们可能不时更新本条款。重大变更会通过站内通知或邮件告知，并在变更生效日期前给予合理期限。
            继续使用本服务即视为接受变更后的条款；如不同意，你可以停止使用并注销账户。
          </P>

          <H2>14. 联系方式</H2>
          <P>
            对本条款有任何疑问，请发邮件至{' '}
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
