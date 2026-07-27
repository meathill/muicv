import { pickLang, type TemplateLang, type TemplateResumeData } from '@muicv/shared';

import { TemplatePage } from './template-helpers';
import styles from './templates.module.css';

import type { TemplateSlots } from './registry';

export type T6Props = {
  resume: TemplateResumeData;
  lang: TemplateLang;
  accent?: string;
  slots?: TemplateSlots;
};

export default function T6Academic({ resume, lang, accent, slots }: T6Props) {
  const d = resume;
  const text = (node: Parameters<typeof pickLang<string>>[0]) => pickLang(node, lang) as string;
  const arr = (node: Parameters<typeof pickLang<string[]>>[0]) => pickLang<string[]>(node, lang) as string[];
  const altLang: TemplateLang = lang === 'zh' ? 'en' : 'zh';
  const altName = pickLang(d.name, altLang) as string;

  return (
    <TemplatePage className={styles.t6} accent={accent}>
      <header className={styles.t6__head}>
        <div>
          <h1 className={styles.t6__name}>
            {text(d.name)}
            {altName && lang === 'zh' ? <span className={styles.t6__nameEn}>{altName}</span> : null}
          </h1>
          <div className={styles.t6__addr}>
            {d.contact.location ? <span>{text(d.contact.location)}</span> : null}
            {d.contact.email ? <span>{d.contact.email}</span> : null}
            {d.contact.phone ? <span>{d.contact.phone}</span> : null}
            {d.contact.web ? <span>{d.contact.web}</span> : null}
          </div>
        </div>
        {d.photoUrl ? (
          <div className={styles.t6__photo} data-photo-slot>
            <img src={d.photoUrl} alt="" width={200} height={266} decoding="async" />
            {slots?.photo}
          </div>
        ) : slots?.photo ? (
          <div className={styles.t6__photo} data-photo-slot>
            {slots.photo}
          </div>
        ) : null}
      </header>

      <h2 className={styles.t6__h2}>{lang === 'en' ? 'Research Statement' : '研究自述'}</h2>
      <p className={styles.t6__statement}>{text(d.summary)}</p>

      <h2 className={styles.t6__h2}>{lang === 'en' ? 'Education' : '教育背景'}</h2>
      {d.education.map((e, i) => (
        <div key={i} className={styles.t6__row}>
          <div className={styles.t6__yr}>{e.period}</div>
          <div>
            <b>{text(e.school)}</b>
            <em>, {text(e.degree)}</em>
            {e.detail ? <p className={styles.t6__rowDesc}>{text(e.detail)}</p> : null}
          </div>
        </div>
      ))}

      <h2 className={styles.t6__h2}>{lang === 'en' ? 'Research & Professional Experience' : '研究与工作经历'}</h2>
      {d.experience.map((e, i) => (
        <div key={i} className={styles.t6__row}>
          <div className={styles.t6__yr}>{e.period}</div>
          <div>
            <b>{text(e.role)}</b>
            <em>, {text(e.org)}</em>
            {e.location ? <span className={styles.t6__rowMeta}>{text(e.location)}</span> : null}
            <ul>
              {arr(e.bullets).map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}

      {d.publications && d.publications.length > 0 ? (
        <>
          <h2 className={styles.t6__h2}>{lang === 'en' ? 'Publications' : '发表论文'}</h2>
          <div className={styles.t6__pubs}>
            {d.publications.map((pub, i) => (
              <div key={i} className={styles.t6__pubRow}>
                <div>
                  <span className={styles.t6__pubAuth}>{pub.authors}</span> (2025).{' '}
                  <span className={styles.t6__pubTitle}>{text(pub.title)}</span>{' '}
                  <span className={styles.t6__pubVen}>
                    <em>{pub.venue}</em>.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <h2 className={styles.t6__h2}>{lang === 'en' ? 'Selected Projects & Open Source' : '代表项目与开源'}</h2>
      {d.projects.map((pr, i) => (
        <div key={i} className={styles.t6__row}>
          <div className={styles.t6__yr}>{pr.period ?? ''}</div>
          <div>
            <b>{text(pr.name)}</b>
            {pr.stack ? <span className={styles.t6__rowMeta}>{pr.stack}</span> : null}
            <p className={styles.t6__rowDesc}>{text(pr.desc)}</p>
          </div>
        </div>
      ))}

      {d.awards && d.awards.length > 0 ? (
        <>
          <h2 className={styles.t6__h2}>{lang === 'en' ? 'Honors & Awards' : '荣誉与奖项'}</h2>
          {d.awards.map((a, i) => (
            <div key={i} className={styles.t6__row}>
              <div className={styles.t6__yr}>{a.year}</div>
              <div>
                <b>{text(a.title)}</b>
              </div>
            </div>
          ))}
        </>
      ) : null}

      <h2 className={styles.t6__h2}>{lang === 'en' ? 'Skills & Languages' : '技能与语言'}</h2>
      <div className={styles.t6__inline}>
        {d.skills.code && d.skills.code.length > 0 ? (
          <div>
            <span className={styles.t6__inlineLbl}>{lang === 'en' ? 'Programming' : '编程'}</span>
            <span>{d.skills.code.join(', ')}</span>
          </div>
        ) : null}
        {d.skills.design && d.skills.design.length > 0 ? (
          <div>
            <span className={styles.t6__inlineLbl}>{lang === 'en' ? 'Design Tools' : '设计工具'}</span>
            <span>{d.skills.design.join(', ')}</span>
          </div>
        ) : null}
        {d.skills.research ? (
          <div>
            <span className={styles.t6__inlineLbl}>{lang === 'en' ? 'Research' : '研究方法'}</span>
            <span>{arr(d.skills.research).join(', ')}</span>
          </div>
        ) : null}
        {d.languages && d.languages.length > 0 ? (
          <div>
            <span className={styles.t6__inlineLbl}>{lang === 'en' ? 'Languages' : '语言'}</span>
            <span>{d.languages.map((lg) => `${text(lg.name)} (${text(lg.level)})`).join(', ')}</span>
          </div>
        ) : null}
      </div>
    </TemplatePage>
  );
}
