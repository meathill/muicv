import { pickLang, type TemplateLang, type TemplateResumeData } from '@muicv/shared';

import { TemplatePage } from './template-helpers';
import styles from './templates.module.css';

import type { TemplateSlots } from './registry';

export type T5Props = {
  resume: TemplateResumeData;
  lang: TemplateLang;
  accent?: string;
  slots?: TemplateSlots;
};

export default function T5Timeline({ resume, lang, accent, slots }: T5Props) {
  const d = resume;
  const text = (node: Parameters<typeof pickLang<string>>[0]) => pickLang(node, lang) as string;
  const arr = (node: Parameters<typeof pickLang<string[]>>[0]) => pickLang<string[]>(node, lang) as string[];
  const altLang: TemplateLang = lang === 'zh' ? 'en' : 'zh';
  const altName = pickLang(d.name, altLang) as string;

  return (
    <TemplatePage className={styles.t5} accent={accent}>
      <header className={styles.t5__head}>
        <div>
          <h1 className={styles.t5__name}>
            {text(d.name)}
            {altName && lang === 'zh' ? <span className={styles.t5__nameEn}>{altName}</span> : null}
          </h1>
          <div className={styles.t5__title}>{text(d.title)}</div>
          {d.tagline ? <p className={styles.t5__tag}>{text(d.tagline)}</p> : null}
          <div className={styles.t5__contact}>
            {d.contact.location || d.contact.email ? (
              <div>
                <b>{lang === 'en' ? 'Where' : '所在'}</b>
                {[text(d.contact.location), d.contact.email].filter(Boolean).join('  ·  ')}
              </div>
            ) : null}
            {d.contact.web || d.contact.github || d.contact.phone ? (
              <div>
                <b>{lang === 'en' ? 'Online' : '在线'}</b>
                {[d.contact.web, d.contact.github, d.contact.phone].filter(Boolean).join('  ·  ')}
              </div>
            ) : null}
          </div>
        </div>
        {d.photoUrl ? (
          <div className={styles.t5__photo} data-photo-slot>
            <img src={d.photoUrl} alt="" width={200} height={266} decoding="async" />
            {slots?.photo}
          </div>
        ) : slots?.photo ? (
          <div className={styles.t5__photo} data-photo-slot>
            {slots.photo}
          </div>
        ) : null}
      </header>

      <section className={styles.t5__section}>
        <h2 className={styles.t5__h2}>{lang === 'en' ? 'Profile' : '个人简介'}</h2>
        <p className={styles.t5__summary}>{text(d.summary)}</p>
      </section>

      <section className={styles.t5__section}>
        <h2 className={styles.t5__h2}>{lang === 'en' ? 'Career Timeline' : '经历时间线'}</h2>
        <div className={styles.t5__rail}>
          {d.experience.map((e, i) => (
            <div key={i} className={styles.t5__node}>
              <div className={styles.t5__expHead}>
                <span className={styles.t5__expRole}>{text(e.role)}</span>
                <span className={styles.t5__expOrg}>{text(e.org)}</span>
                <span className={styles.t5__expMeta}>
                  {e.period}
                  {e.location ? `  ·  ${text(e.location)}` : ''}
                </span>
              </div>
              <ul>
                {arr(e.bullets).map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
          {d.education.map((e, i) => (
            <div key={`edu-${i}`} className={styles.t5__node}>
              <div className={styles.t5__expHead}>
                <span className={styles.t5__expRole}>{text(e.school)}</span>
                <span className={styles.t5__expOrg}>{text(e.degree)}</span>
                <span className={styles.t5__expMeta}>{e.period}</span>
              </div>
              {e.detail ? <div className={styles.t5__nodeDetail}>{text(e.detail)}</div> : null}
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.t5__section} ${styles.t5__bottom}`}>
        <div>
          <h2 className={styles.t5__h2}>{lang === 'en' ? 'Projects' : '代表项目'}</h2>
          <div className={styles.t5__projects}>
            {d.projects.slice(0, 3).map((pr, i) => (
              <div key={i} className={styles.t5__proj}>
                <div className={styles.t5__projHead}>
                  <div>
                    <b>{text(pr.name)}</b>
                    {pr.stack ? <span className={styles.t5__projStack}> {pr.stack}</span> : null}
                  </div>
                  {pr.period ? <span className={styles.t5__projPeriod}>{pr.period}</span> : null}
                </div>
                <p className={styles.t5__projDesc}>{text(pr.desc)}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className={styles.t5__h2}>{lang === 'en' ? 'Skills & Languages' : '技能与语言'}</h2>
          <div className={styles.t5__skills}>
            {d.skills.design && d.skills.design.length > 0 ? (
              <div className={styles.t5__skillRow}>
                <span className={styles.t5__skillLbl}>{lang === 'en' ? 'Design' : '设计'}</span>
                <span className={styles.t5__skillItems}>{d.skills.design.join(' · ')}</span>
              </div>
            ) : null}
            {d.skills.code && d.skills.code.length > 0 ? (
              <div className={styles.t5__skillRow}>
                <span className={styles.t5__skillLbl}>{lang === 'en' ? 'Code' : '工程'}</span>
                <span className={styles.t5__skillItems}>{d.skills.code.join(' · ')}</span>
              </div>
            ) : null}
            {d.skills.research ? (
              <div className={styles.t5__skillRow}>
                <span className={styles.t5__skillLbl}>{lang === 'en' ? 'Research' : '研究'}</span>
                <span className={styles.t5__skillItems}>{arr(d.skills.research).join(' · ')}</span>
              </div>
            ) : null}
          </div>
          {d.languages && d.languages.length > 0 ? (
            <div className={styles.t5__lang}>
              {d.languages.map((lg, i) => (
                <div key={i}>
                  <span>{text(lg.name)}</span>
                  <span className={styles.t5__lvl}>{text(lg.level)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </TemplatePage>
  );
}
