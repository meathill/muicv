import { pickLang, type TemplateLang, type TemplateResumeData } from '@muicv/shared';

import { TemplatePage } from './template-helpers';
import styles from './templates.module.css';

import type { TemplateSlots } from './registry';

export type T3Props = {
  resume: TemplateResumeData;
  lang: TemplateLang;
  accent?: string;
  slots?: TemplateSlots;
};

export default function T3Sidebar({ resume, lang, accent, slots }: T3Props) {
  const d = resume;
  const text = (node: Parameters<typeof pickLang<string>>[0]) => pickLang(node, lang) as string;
  const arr = (node: Parameters<typeof pickLang<string[]>>[0]) => pickLang<string[]>(node, lang) as string[];
  const altLang: TemplateLang = lang === 'zh' ? 'en' : 'zh';
  const altName = pickLang(d.name, altLang) as string;

  return (
    <TemplatePage className={styles.t3} accent={accent}>
      <aside className={styles.t3__side}>
        {d.photoUrl ? (
          <div className={styles.t3__photo} data-photo-slot>
            <img src={d.photoUrl} alt="" width={200} height={266} decoding="async" />
            {slots?.photo}
          </div>
        ) : slots?.photo ? (
          <div className={styles.t3__photo} data-photo-slot>
            {slots.photo}
          </div>
        ) : null}
        <h1 className={styles.t3__name}>
          {text(d.name)}
          {altName && lang === 'zh' ? <span className={styles.t3__nameEn}>{altName}</span> : null}
        </h1>
        <div className={styles.t3__title}>{text(d.title)}</div>

        <div className={styles.t3__sideSec}>
          <div className={styles.t3__sideH}>{lang === 'en' ? 'Contact' : '联系方式'}</div>
          <div className={styles.t3__contact}>
            {d.contact.location ? (
              <div>
                <span className={styles.t3__contactLbl}>Loc</span>
                <span>{text(d.contact.location)}</span>
              </div>
            ) : null}
            {d.contact.email ? (
              <div>
                <span className={styles.t3__contactLbl}>Mail</span>
                <span>{d.contact.email}</span>
              </div>
            ) : null}
            {d.contact.phone ? (
              <div>
                <span className={styles.t3__contactLbl}>Tel</span>
                <span>{d.contact.phone}</span>
              </div>
            ) : null}
            {d.contact.web ? (
              <div>
                <span className={styles.t3__contactLbl}>Web</span>
                <span>{d.contact.web}</span>
              </div>
            ) : null}
            {d.contact.github ? (
              <div>
                <span className={styles.t3__contactLbl}>Git</span>
                <span>{d.contact.github}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.t3__sideSec}>
          <div className={styles.t3__sideH}>{lang === 'en' ? 'Skills' : '技能'}</div>
          {d.skills.design && d.skills.design.length > 0 ? (
            <div className={styles.t3__skillGroup}>
              <div className={styles.t3__skillName}>{lang === 'en' ? 'Design' : '设计'}</div>
              <div className={styles.t3__skillItems}>{d.skills.design.join(' · ')}</div>
            </div>
          ) : null}
          {d.skills.code && d.skills.code.length > 0 ? (
            <div className={styles.t3__skillGroup}>
              <div className={styles.t3__skillName}>{lang === 'en' ? 'Engineering' : '工程'}</div>
              <div className={styles.t3__skillItems}>{d.skills.code.join(' · ')}</div>
            </div>
          ) : null}
          {d.skills.research ? (
            <div className={styles.t3__skillGroup}>
              <div className={styles.t3__skillName}>{lang === 'en' ? 'Research' : '研究'}</div>
              <div className={styles.t3__skillItems}>{arr(d.skills.research).join(' · ')}</div>
            </div>
          ) : null}
        </div>

        {d.languages && d.languages.length > 0 ? (
          <div className={styles.t3__sideSec}>
            <div className={styles.t3__sideH}>{lang === 'en' ? 'Languages' : '语言'}</div>
            <div className={styles.t3__lang}>
              {d.languages.map((lg, i) => (
                <div key={i}>
                  <span>{text(lg.name)}</span>
                  <span className={styles.t3__lvl}>{text(lg.level)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {d.awards && d.awards.length > 0 ? (
          <div className={styles.t3__sideSec}>
            <div className={styles.t3__sideH}>{lang === 'en' ? 'Awards' : '荣誉'}</div>
            <div className={styles.t3__lang}>
              {d.awards.map((a, i) => (
                <div key={i}>
                  <span style={{ flex: 1 }}>{text(a.title)}</span>
                  <span className={styles.t3__lvl}>{a.year}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </aside>

      <main className={styles.t3__main}>
        <section className={styles.t3__section}>
          <h2 className={styles.t3__h2}>{lang === 'en' ? 'Profile' : '个人简介'}</h2>
          <p className={styles.t3__summary}>{text(d.summary)}</p>
        </section>

        <section className={styles.t3__section}>
          <h2 className={styles.t3__h2}>{lang === 'en' ? 'Experience' : '工作经历'}</h2>
          <div className={styles.t3__exp}>
            {d.experience.map((e, i) => (
              <div key={i}>
                <div className={styles.t3__expHead}>
                  <span className={styles.t3__expRole}>{text(e.role)}</span>
                  <span className={styles.t3__expOrg}>{text(e.org)}</span>
                  <span className={styles.t3__expMeta}>{e.period}</span>
                </div>
                <ul>
                  {arr(e.bullets).map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.t3__section}>
          <h2 className={styles.t3__h2}>{lang === 'en' ? 'Education' : '教育背景'}</h2>
          <div className={styles.t3__edu}>
            {d.education.map((e, i) => (
              <div key={i}>
                <div className={styles.t3__eduRow}>
                  <div>
                    <b>{text(e.school)}</b>
                    <span className={styles.t3__eduDeg}>{text(e.degree)}</span>
                  </div>
                  <span className={styles.t3__eduMeta}>{e.period}</span>
                </div>
                {e.detail ? <div className={styles.t3__eduDetail}>{text(e.detail)}</div> : null}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.t3__section}>
          <h2 className={styles.t3__h2}>{lang === 'en' ? 'Selected Projects' : '代表项目'}</h2>
          <div className={styles.t3__projects}>
            {d.projects.slice(0, 2).map((pr, i) => (
              <div key={i} className={styles.t3__projRow}>
                <div className={styles.t3__projHead}>
                  <div>
                    <b>{text(pr.name)}</b>
                    {pr.stack ? <span className={styles.t3__projStack}>{pr.stack}</span> : null}
                  </div>
                  {pr.period ? <span className={styles.t3__projPeriod}>{pr.period}</span> : null}
                </div>
                <p className={styles.t3__projDesc}>{text(pr.desc)}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </TemplatePage>
  );
}
