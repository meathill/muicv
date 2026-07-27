import { pickLang, type TemplateLang, type TemplateResumeData } from '@muicv/shared';

import { TemplatePage } from './template-helpers';
import styles from './templates.module.css';

import type { TemplateSlots } from './registry';

export type T2Props = {
  resume: TemplateResumeData;
  lang: TemplateLang;
  accent?: string;
  slots?: TemplateSlots;
};

/**
 * 名字 split：把字符串拆成「姓 名」两段，第二段加重。
 * 中文按一个汉字 = 姓；英文按空格分。覆盖不了的形态返回原文 + 空 emphasized。
 */
function splitName(name: string, lang: TemplateLang): { lead: string; emphasized: string } {
  if (!name) return { lead: '', emphasized: '' };
  if (lang === 'en') {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return { lead: '', emphasized: name };
    return { lead: `${parts.slice(0, -1).join(' ')} `, emphasized: parts.at(-1) ?? '' };
  }
  // zh：拆姓 + 名（取首字符为姓，余下为名）
  const trimmed = name.replace(/\s+/g, '');
  if (trimmed.length < 2) return { lead: '', emphasized: trimmed };
  return { lead: `${trimmed[0] ?? ''} `, emphasized: trimmed.slice(1) };
}

export default function T2Minimal({ resume, lang, accent, slots }: T2Props) {
  const d = resume;
  const text = (node: Parameters<typeof pickLang<string>>[0]) => pickLang(node, lang) as string;
  const arr = (node: Parameters<typeof pickLang<string[]>>[0]) => pickLang<string[]>(node, lang) as string[];
  const { lead, emphasized } = splitName(text(d.name), lang);

  return (
    <TemplatePage className={styles.t2} accent={accent}>
      <header className={styles.t2__top}>
        {d.photoUrl ? (
          <div className={styles.t2__photo} data-photo-slot>
            <img src={d.photoUrl} alt="" width={200} height={266} decoding="async" />
            {slots?.photo}
          </div>
        ) : slots?.photo ? (
          <div className={styles.t2__photo} data-photo-slot>
            {slots.photo}
          </div>
        ) : null}
        <div>
          <h1 className={styles.t2__name}>
            {lead}
            <b>{emphasized}</b>
          </h1>
          <div className={styles.t2__title}>{text(d.title)}</div>
        </div>
        <div className={styles.t2__contact}>
          {d.contact.location ? (
            <span>
              <b>{text(d.contact.location)}</b>
            </span>
          ) : null}
          {d.contact.email ? <span>{d.contact.email}</span> : null}
          {d.contact.phone ? <span>{d.contact.phone}</span> : null}
          {d.contact.web ? <span>{d.contact.web}</span> : null}
          {d.contact.github ? <span>{d.contact.github}</span> : null}
        </div>
      </header>

      <div className={styles.t2__grid}>
        <h2 className={styles.t2__h2}>{lang === 'en' ? 'About' : '关于'}</h2>
        <div className={styles.t2__col}>
          <p className={styles.t2__summary}>{text(d.summary)}</p>
        </div>

        <h2 className={styles.t2__h2}>{lang === 'en' ? 'Experience' : '工作'}</h2>
        <div className={styles.t2__col}>
          <div className={styles.t2__exp}>
            {d.experience.map((e, i) => (
              <div key={i} className={styles.t2__expRow}>
                <div className={styles.t2__expHead}>
                  <span className={styles.t2__expRole}>{text(e.role)}</span>
                  <span className={styles.t2__expOrg}>{text(e.org)}</span>
                  <span className={styles.t2__expMeta}>
                    {e.period}
                    {e.location ? ` · ${text(e.location)}` : ''}
                  </span>
                </div>
                <ul className={styles.t2__expBullets}>
                  {arr(e.bullets).map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <h2 className={styles.t2__h2}>{lang === 'en' ? 'Education' : '教育'}</h2>
        <div className={styles.t2__col}>
          {d.education.map((e, i) => (
            <div key={i} className={styles.t2__eduRow}>
              <div className={styles.t2__rowSpace}>
                <div>
                  <b>{text(e.school)}</b>
                  <span className={styles.t2__eduDeg}> · {text(e.degree)}</span>
                </div>
                <span className={styles.t2__eduMeta}>{e.period}</span>
              </div>
              {e.detail ? <div className={styles.t2__eduMeta}>{text(e.detail)}</div> : null}
            </div>
          ))}
        </div>

        <h2 className={styles.t2__h2}>{lang === 'en' ? 'Projects' : '项目'}</h2>
        <div className={styles.t2__col}>
          {d.projects.slice(0, 3).map((pr, i) => (
            <div key={i} className={styles.t2__projRow}>
              <div className={styles.t2__rowSpace}>
                <div>
                  <b>{text(pr.name)}</b>
                  {pr.stack ? <span className={styles.t2__projStack}>{pr.stack}</span> : null}
                </div>
                {pr.period ? <span className={styles.t2__projMeta}>{pr.period}</span> : null}
              </div>
              <p className={styles.t2__projDesc}>{text(pr.desc)}</p>
            </div>
          ))}
        </div>

        <h2 className={styles.t2__h2}>{lang === 'en' ? 'Skills' : '技能'}</h2>
        <div className={`${styles.t2__col} ${styles.t2__skills}`}>
          {d.skills.design && d.skills.design.length > 0 ? (
            <div>
              <b>{lang === 'en' ? 'Design' : '设计'} —</b> {d.skills.design.join(' · ')}
            </div>
          ) : null}
          {d.skills.code && d.skills.code.length > 0 ? (
            <div>
              <b>{lang === 'en' ? 'Engineering' : '工程'} —</b> {d.skills.code.join(' · ')}
            </div>
          ) : null}
          {d.skills.research ? (
            <div>
              <b>{lang === 'en' ? 'Research' : '研究'} —</b> {arr(d.skills.research).join(' · ')}
            </div>
          ) : null}
          {d.languages && d.languages.length > 0 ? (
            <div>
              <b>{lang === 'en' ? 'Languages' : '语言'} —</b>{' '}
              {d.languages.map((lg) => `${text(lg.name)} (${text(lg.level)})`).join(' · ')}
            </div>
          ) : null}
        </div>
      </div>
    </TemplatePage>
  );
}
