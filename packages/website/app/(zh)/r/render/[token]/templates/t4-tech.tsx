import { pickLang, type TemplateLang, type TemplateResumeData } from '@muicv/shared';
import type { TemplateSlots } from './registry';
import { TemplatePage } from './template-helpers';
import styles from './templates.module.css';

export type T4Props = {
  resume: TemplateResumeData;
  lang: TemplateLang;
  accent?: string | undefined;
  slots?: TemplateSlots | undefined;
};

export default function T4Tech({ resume, lang, accent, slots }: T4Props) {
  const d = resume;
  const text = (node: Parameters<typeof pickLang<string>>[0]) => pickLang(node, lang) as string;
  const arr = (node: Parameters<typeof pickLang<string[]>>[0]) => pickLang<string[]>(node, lang) as string[];
  const altLang: TemplateLang = lang === 'zh' ? 'en' : 'zh';
  const altName = pickLang(d.name, altLang) as string;
  // 空内容整体跳过 section（含标题），避免出现"有标题没内容"或 "[0]" 的空洞版式。
  const hasStack =
    (d.skills.code?.length ?? 0) > 0 ||
    (d.skills.design?.length ?? 0) > 0 ||
    (d.skills.research ? arr(d.skills.research).length > 0 : false);
  const hasExtras = (d.languages?.length ?? 0) > 0 || (d.awards?.length ?? 0) > 0;

  return (
    <TemplatePage className={styles.t4} accent={accent}>
      <header className={styles.t4__head}>
        {d.photoUrl ? (
          <div className={styles.t4__photo} data-photo-slot>
            <img src={d.photoUrl} alt="" width={200} height={266} decoding="async" />
            {slots?.photo}
          </div>
        ) : slots?.photo ? (
          <div className={styles.t4__photo} data-photo-slot>
            {slots.photo}
          </div>
        ) : null}
        <div>
          <h1 className={styles.t4__name}>
            {text(d.name)}
            {altName ? (
              <span className={styles.t4__nameTag}>
                {'// '}
                {altName}
              </span>
            ) : null}
          </h1>
          <div className={styles.t4__title}>whoami → {text(d.title)}</div>
        </div>
        <div className={styles.t4__contact}>
          {d.contact.email ? (
            <span>
              <b>email</b> {d.contact.email}
            </span>
          ) : null}
          {d.contact.phone ? (
            <span>
              <b>phone</b> {d.contact.phone}
            </span>
          ) : null}
          {d.contact.web ? (
            <span>
              <b>web</b> {d.contact.web}
            </span>
          ) : null}
          {d.contact.github ? (
            <span>
              <b>git</b> {d.contact.github}
            </span>
          ) : null}
          {d.contact.location ? (
            <span>
              <b>loc</b> {text(d.contact.location)}
            </span>
          ) : null}
        </div>
      </header>

      <section className={styles.t4__section}>
        <h2 className={styles.t4__h2}>summary</h2>
        <p className={styles.t4__summary}>{text(d.summary)}</p>
      </section>

      {hasStack ? (
        <section className={styles.t4__section}>
          <h2 className={styles.t4__h2}>stack</h2>
          <div className={styles.t4__skillGrid}>
            {d.skills.code && d.skills.code.length > 0 ? (
              <>
                <div className={styles.t4__skillLbl}>code</div>
                <div className={styles.t4__tags}>
                  {d.skills.code.map((s, i) => (
                    <span key={i} className={`${styles.t4__tag} ${i < 3 ? styles.t4__tagAlt : ''}`}>
                      {s}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
            {d.skills.design && d.skills.design.length > 0 ? (
              <>
                <div className={styles.t4__skillLbl}>design</div>
                <div className={styles.t4__tags}>
                  {d.skills.design.map((s, i) => (
                    <span key={i} className={styles.t4__tag}>
                      {s}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
            {d.skills.research ? (
              <>
                <div className={styles.t4__skillLbl}>research</div>
                <div className={styles.t4__tags}>
                  {arr(d.skills.research).map((s, i) => (
                    <span key={i} className={styles.t4__tag}>
                      {s}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {d.experience.length > 0 ? (
        <section className={styles.t4__section}>
          <h2 className={styles.t4__h2}>
            experience <span className={styles.t4__h2Count}>[{d.experience.length}]</span>
          </h2>
          <div className={styles.t4__exp}>
            {d.experience.map((e, i) => (
              <div key={i} className={styles.t4__expRow}>
                <div className={styles.t4__expHead}>
                  <span className={styles.t4__expRole}>{text(e.role)}</span>
                  <span className={styles.t4__expOrg}>@ {text(e.org)}</span>
                  <span className={styles.t4__expMeta}>{e.period}</span>
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
      ) : null}

      {d.projects.length > 0 ? (
        <section className={styles.t4__section}>
          <h2 className={styles.t4__h2}>
            projects <span className={styles.t4__h2Count}>[{d.projects.length}]</span>
          </h2>
          <div className={styles.t4__projects}>
            {d.projects.map((pr, i) => (
              <div key={i} className={styles.t4__projCard}>
                <div className={styles.t4__projCardHead}>
                  <b>{text(pr.name)}</b>
                  {pr.period ? <span className={styles.t4__projMeta}>{pr.period}</span> : null}
                </div>
                {pr.stack ? <div className={styles.t4__projStack}>{pr.stack}</div> : null}
                <p className={styles.t4__projDesc}>{text(pr.desc)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {d.education.length > 0 || hasExtras ? (
        <section className={`${styles.t4__section} ${styles.t4__bottom}`}>
          {d.education.length > 0 ? (
            <div>
              <h2 className={styles.t4__h2}>education</h2>
              <div className={styles.t4__edu}>
                {d.education.map((e, i) => (
                  <div key={i} className={styles.t4__eduRow}>
                    <div className={styles.t4__eduHead}>
                      <b>{text(e.school)}</b>
                      <span className={styles.t4__eduMeta}>{e.period}</span>
                    </div>
                    <div className={styles.t4__eduDeg}>{text(e.degree)}</div>
                    {e.detail ? <div className={styles.t4__eduDetail}>{text(e.detail)}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {hasExtras ? (
            <div>
              <h2 className={styles.t4__h2}>extras</h2>
              <div className={styles.t4__extras}>
                {(d.languages ?? []).map((lg, i) => (
                  <div key={i}>
                    {text(lg.name)} → <span className={styles.t4__extrasAccent}>{text(lg.level)}</span>
                  </div>
                ))}
                {d.awards && d.awards.length > 0 ? (
                  <div className={styles.t4__awards}>
                    {d.awards.map((a) => `${a.year}  ${text(a.title)}`).join('  ·  ')}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </TemplatePage>
  );
}
