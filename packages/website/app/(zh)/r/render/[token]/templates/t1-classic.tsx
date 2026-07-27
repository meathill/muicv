import { pickLang, type TemplateLang, type TemplateResumeData } from '@muicv/shared';

import { TemplatePage } from './template-helpers';
import styles from './templates.module.css';

import type { TemplateSlots } from './registry';

export type T1Props = {
  resume: TemplateResumeData;
  lang: TemplateLang;
  accent?: string;
  slots?: TemplateSlots;
};

export default function T1Classic({ resume, lang, accent, slots }: T1Props) {
  const d = resume;
  const p = <T,>(node: Parameters<typeof pickLang<T>>[0]) => pickLang<T>(node, lang) as T;
  const text = (node: Parameters<typeof pickLang<string>>[0]) => pickLang(node, lang) as string;
  const altLang: TemplateLang = lang === 'zh' ? 'en' : 'zh';
  const altName = pickLang(d.name, altLang) as string;

  return (
    <TemplatePage className={styles.t1} accent={accent}>
      <header className={styles.t1__head}>
        {d.photoUrl ? (
          <div className={styles.t1__photo} data-photo-slot>
            <img src={d.photoUrl} alt="" width={200} height={266} decoding="async" />
            {slots?.photo}
          </div>
        ) : slots?.photo ? (
          <div className={styles.t1__photo} data-photo-slot>
            {slots.photo}
          </div>
        ) : null}
        <h1 className={styles.t1__name}>
          {text(d.name)}
          {altName ? <span className={lang === 'zh' ? styles.t1__nameEn : styles.t1__nameZhAlt}>{altName}</span> : null}
        </h1>
        <div className={styles.t1__title}>{text(d.title)}</div>
        <div className={styles.t1__contact}>
          {d.contact.location ? <span>{text(d.contact.location)}</span> : null}
          {d.contact.email ? (
            <>
              <span className={styles.t1__contactDot} />
              <span>{d.contact.email}</span>
            </>
          ) : null}
          {d.contact.phone ? (
            <>
              <span className={styles.t1__contactDot} />
              <span>{d.contact.phone}</span>
            </>
          ) : null}
          {d.contact.web ? (
            <>
              <span className={styles.t1__contactDot} />
              <span>{d.contact.web}</span>
            </>
          ) : null}
          {d.contact.github ? (
            <>
              <span className={styles.t1__contactDot} />
              <span>{d.contact.github}</span>
            </>
          ) : null}
        </div>
      </header>

      <section className={styles.t1__section}>
        <h2 className={styles.t1__h2}>{lang === 'en' ? 'Profile' : '个人简介'}</h2>
        <p className={styles.t1__summary}>{text(d.summary)}</p>
      </section>

      <section className={styles.t1__section}>
        <h2 className={styles.t1__h2}>{lang === 'en' ? 'Experience' : '工作经历'}</h2>
        <div className={styles.t1__exp}>
          {d.experience.map((e, i) => (
            <div key={i} className={styles.t1__expRow}>
              <div className={styles.t1__expDate}>
                {e.period}
                {e.location ? (
                  <>
                    <br />
                    {text(e.location)}
                  </>
                ) : null}
              </div>
              <div className={styles.t1__expBody}>
                <div className={styles.t1__expHead}>
                  <div>
                    <span className={styles.t1__expRole}>{text(e.role)}</span>
                    <span className={styles.t1__expOrg}> · {text(e.org)}</span>
                  </div>
                </div>
                <ul>
                  {p<string[]>(e.bullets).map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.t1__section}>
        <h2 className={styles.t1__h2}>{lang === 'en' ? 'Education' : '教育背景'}</h2>
        <div className={styles.t1__edu}>
          {d.education.map((e, i) => (
            <div key={i} className={styles.t1__eduRow}>
              <span className={styles.t1__expDate}>{e.period}</span>
              <div>
                <b>{text(e.school)}</b>
                <span className={styles.t1__eduDeg}> · {text(e.degree)}</span>
                {e.detail ? <div className={styles.t1__eduDetail}>{text(e.detail)}</div> : null}
              </div>
              <span />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.t1__section}>
        <h2 className={styles.t1__h2}>{lang === 'en' ? 'Selected Projects' : '代表项目'}</h2>
        <div className={styles.t1__projects}>
          {d.projects.slice(0, 3).map((pr, i) => (
            <div key={i} className={styles.t1__projRow}>
              <span className={styles.t1__projMeta}>{pr.period ?? ''}</span>
              <div>
                <b>{text(pr.name)}</b>
                {pr.stack ? <span className={styles.t1__projStack}>{pr.stack}</span> : null}
                <p className={styles.t1__projDesc}>{text(pr.desc)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.t1__section} ${styles.t1__bottom}`}>
        <div>
          <h2 className={`${styles.t1__h2} ${styles.t1__h2Left}`}>{lang === 'en' ? 'Skills' : '技能'}</h2>
          <div className={styles.t1__chips}>
            {[...(d.skills.design ?? []), ...(d.skills.code ?? [])].map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </div>
        </div>
        <div>
          <h2 className={`${styles.t1__h2} ${styles.t1__h2Left}`}>
            {lang === 'en' ? 'Languages & Awards' : '语言 & 荣誉'}
          </h2>
          <div className={styles.t1__lang}>
            {(d.languages ?? []).map((lg, i) => (
              <div key={i}>
                <span>{text(lg.name)}</span>
                <span className={styles.t1__lvl}>{text(lg.level)}</span>
              </div>
            ))}
            {d.awards && d.awards.length > 0 ? (
              <div className={styles.t1__awards}>
                {d.awards
                  .slice(0, 2)
                  .map((a) => `${a.year} ${text(a.title)}`)
                  .join(' · ')}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </TemplatePage>
  );
}
