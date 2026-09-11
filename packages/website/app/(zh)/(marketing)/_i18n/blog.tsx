import { CONTENT_LOCALES, contentLocalePrefix, type ContentLocale, type PostSection } from '@muicv/shared';

/**
 * 博客（posts）的本地化文案与 URL 映射。
 *
 * 与营销站整站词典（_i18n/types.ts 的 Dictionary）分开：博客是第一个本地化的面，
 * 用这份小词典即可支撑 9 种语言，不必等整站营销文案翻译完。整站本地化见 WIP。
 */

/** 内容 locale → URL 前缀段。规则在 shared，保证 sitemap 与页面一致。 */
export function blogUrlPrefix(locale: ContentLocale): string {
  return contentLocalePrefix(locale);
}

/**
 * 有本地化营销页的语言（首页 / download / pricing / about / contact）。
 * 目前只有 zh（无前缀）与 en（/en）；其余语言的博客壳需要落到英文页而不是造 404。
 */
const MARKETING_LOCALES = new Set<ContentLocale>(['zh-CN', 'en']);

/**
 * 营销页链接（首页、下载等）。只有 zh/en 有本地化版本，其它语言回退到英文页，
 * 避免 /ja/download 这类不存在的地址。博客自身路径请用 blogUrlPrefix（全语言都有）。
 */
export function marketingHref(locale: ContentLocale, path: string): string {
  if (MARKETING_LOCALES.has(locale)) return `${contentLocalePrefix(locale)}${path}`;
  return `/en${path}`;
}

/** HTML lang 属性值。 */
export function htmlLang(locale: ContentLocale): string {
  return locale;
}

export function isBlogLocale(value: string): value is ContentLocale {
  return (CONTENT_LOCALES as readonly string[]).includes(value);
}

/** 博客 UI 文案。section 标签在此本地化，替代 shared 里硬编码的中文 POST_SECTION_META.label。 */
export type BlogStrings = {
  brand: string;
  navHome: string;
  navPosts: string;
  eyebrow: string;
  allLabel: string;
  sections: Record<PostSection, string>;
  sectionDescs: Record<PostSection, string>;
  allTitle: string;
  allDescription: string;
  countLabel: (n: number) => string;
  totalLabel: (n: number) => string;
  emptyAll: string;
  emptySection: string;
  breadcrumbHome: string;
  breadcrumbPosts: string;
  readMore: string;
  ctaTitle: string;
  ctaBody: string;
  ctaLink: string;
  footerCopyright: string;
};

export const BLOG_STRINGS: Record<ContentLocale, BlogStrings> = {
  'zh-CN': {
    brand: 'Mui简历',
    navHome: '首页',
    navPosts: '文章',
    eyebrow: 'Posts',
    allLabel: '全部',
    sections: { jobs: '求职博文', product: '产品文章', guide: '使用教程' },
    sectionDescs: {
      jobs: '围绕校招、社招、简历、面试、offer 决策的实用文章。',
      product: 'Mui 简历的产品思考、能力说明和使用方式。',
      guide: '从下载安装到素材整理、简历生成、面试复盘的操作指南。',
    },
    allTitle: '全部文章',
    allDescription: '围绕简历、校招、面试、offer 和 AI agent 的求职文章。',
    countLabel: (n) => `${n} 篇`,
    totalLabel: (n) => `共 ${n} 篇`,
    emptyAll: '文章还在整理中，先去 Skill 目录看看已经登记的求职工具。',
    emptySection: '这个分类还在整理内容，先看看其他分类。',
    breadcrumbHome: '首页',
    breadcrumbPosts: '文章',
    readMore: '查看详情',
    ctaTitle: '继续把素材整理好',
    ctaBody:
      '文章只能给方向，真正投递前还是要回到你的经历、项目和目标岗位。Mui app 会把这些材料放在同一个本地素材库里。',
    ctaLink: '下载桌面 app',
    footerCopyright: '© 2026 Mui简历',
  },
  en: {
    brand: 'MuiCV',
    navHome: 'Home',
    navPosts: 'Articles',
    eyebrow: 'Posts',
    allLabel: 'All',
    sections: { jobs: 'Job hunting', product: 'Product', guide: 'Guides' },
    sectionDescs: {
      jobs: 'Practical articles on campus and experienced hiring, resumes, interviews, and offers.',
      product: 'Product thinking, capabilities, and how to use MuiCV.',
      guide: 'Step-by-step guides from install to material organization, resume generation, and interview review.',
    },
    allTitle: 'All articles',
    allDescription: 'Articles on resumes, hiring, interviews, offers, and AI agents.',
    countLabel: (n) => `${n} ${n === 1 ? 'article' : 'articles'}`,
    totalLabel: (n) => `${n} ${n === 1 ? 'article' : 'articles'}`,
    emptyAll: 'Articles are still being organized. Check the Skill directory for available job-hunting tools.',
    emptySection: 'This category is still being organized. Try another category.',
    breadcrumbHome: 'Home',
    breadcrumbPosts: 'Articles',
    readMore: 'Read more',
    ctaTitle: 'Keep your material organized',
    ctaBody:
      'An article can point the way, but before you apply you still need your own experience, projects, and target role. The Mui app keeps that material in one local library.',
    ctaLink: 'Download the desktop app',
    footerCopyright: '© 2026 MuiCV',
  },
  ja: {
    brand: 'MuiCV',
    navHome: 'ホーム',
    navPosts: '記事',
    eyebrow: 'Posts',
    allLabel: 'すべて',
    sections: { jobs: '就職・転職', product: 'プロダクト', guide: 'ガイド' },
    sectionDescs: {
      jobs: '新卒・中途採用、履歴書、面接、オファーに関する実践的な記事。',
      product: 'MuiCV のプロダクト思想、機能、活用方法。',
      guide: 'インストールから素材整理、履歴書生成、面接振り返りまでの操作ガイド。',
    },
    allTitle: 'すべての記事',
    allDescription: '履歴書、就職活動、面接、オファー、AI エージェントに関する記事。',
    countLabel: (n) => `${n} 件`,
    totalLabel: (n) => `全 ${n} 件`,
    emptyAll: '記事を準備中です。求職ツールは Skill ディレクトリをご覧ください。',
    emptySection: 'このカテゴリは準備中です。ほかのカテゴリをご覧ください。',
    breadcrumbHome: 'ホーム',
    breadcrumbPosts: '記事',
    readMore: '詳細を見る',
    ctaTitle: '素材を整理し続けよう',
    ctaBody:
      '記事は方向性を示すだけです。応募の前には、あなた自身の経験・プロジェクト・志望職種に立ち返る必要があります。Mui アプリはそれらを一つのローカル素材庫にまとめます。',
    ctaLink: 'デスクトップアプリをダウンロード',
    footerCopyright: '© 2026 MuiCV',
  },
  de: {
    brand: 'MuiCV',
    navHome: 'Startseite',
    navPosts: 'Artikel',
    eyebrow: 'Posts',
    allLabel: 'Alle',
    sections: { jobs: 'Jobsuche', product: 'Produkt', guide: 'Anleitungen' },
    sectionDescs: {
      jobs: 'Praxisnahe Artikel zu Bewerbung, Lebenslauf, Interview und Angebot.',
      product: 'Produktgedanken, Funktionen und Nutzung von MuiCV.',
      guide: 'Schritt-für-Schritt-Anleitungen von der Installation bis zum Interview-Review.',
    },
    allTitle: 'Alle Artikel',
    allDescription: 'Artikel zu Lebenslauf, Jobsuche, Interview, Angebot und KI-Agenten.',
    countLabel: (n) => `${n} ${n === 1 ? 'Artikel' : 'Artikel'}`,
    totalLabel: (n) => `${n} Artikel`,
    emptyAll: 'Die Artikel werden noch zusammengestellt. Im Skill-Verzeichnis finden Sie verfügbare Tools.',
    emptySection: 'Diese Kategorie wird noch zusammengestellt. Sehen Sie sich eine andere an.',
    breadcrumbHome: 'Startseite',
    breadcrumbPosts: 'Artikel',
    readMore: 'Mehr erfahren',
    ctaTitle: 'Halten Sie Ihr Material organisiert',
    ctaBody:
      'Ein Artikel gibt nur die Richtung vor. Vor der Bewerbung brauchen Sie Ihre eigene Erfahrung, Projekte und Zielrolle. Die Mui-App bündelt dieses Material in einer lokalen Bibliothek.',
    ctaLink: 'Desktop-App herunterladen',
    footerCopyright: '© 2026 MuiCV',
  },
  fr: {
    brand: 'MuiCV',
    navHome: 'Accueil',
    navPosts: 'Articles',
    eyebrow: 'Posts',
    allLabel: 'Tous',
    sections: { jobs: 'Recherche d’emploi', product: 'Produit', guide: 'Guides' },
    sectionDescs: {
      jobs: 'Articles pratiques sur le recrutement, le CV, l’entretien et l’offre.',
      product: 'Réflexions produit, fonctionnalités et utilisation de MuiCV.',
      guide: 'Guides pas à pas, de l’installation à la revue d’entretien.',
    },
    allTitle: 'Tous les articles',
    allDescription: 'Articles sur le CV, la recherche d’emploi, l’entretien, l’offre et les agents IA.',
    countLabel: (n) => `${n} article${n === 1 ? '' : 's'}`,
    totalLabel: (n) => `${n} article${n === 1 ? '' : 's'}`,
    emptyAll: 'Les articles sont en cours d’organisation. Consultez le répertoire Skill pour les outils disponibles.',
    emptySection: 'Cette catégorie est en cours d’organisation. Essayez-en une autre.',
    breadcrumbHome: 'Accueil',
    breadcrumbPosts: 'Articles',
    readMore: 'En savoir plus',
    ctaTitle: 'Gardez vos éléments organisés',
    ctaBody:
      'Un article donne une direction, mais avant de postuler il vous faut votre expérience, vos projets et le poste visé. L’app Mui regroupe ces éléments dans une bibliothèque locale.',
    ctaLink: 'Télécharger l’app desktop',
    footerCopyright: '© 2026 MuiCV',
  },
  es: {
    brand: 'MuiCV',
    navHome: 'Inicio',
    navPosts: 'Artículos',
    eyebrow: 'Posts',
    allLabel: 'Todos',
    sections: { jobs: 'Empleo', product: 'Producto', guide: 'Guías' },
    sectionDescs: {
      jobs: 'Artículos prácticos sobre selección, currículum, entrevista y oferta.',
      product: 'Ideas de producto, capacidades y uso de MuiCV.',
      guide: 'Guías paso a paso, desde la instalación hasta la revisión de la entrevista.',
    },
    allTitle: 'Todos los artículos',
    allDescription: 'Artículos sobre currículum, empleo, entrevista, oferta y agentes de IA.',
    countLabel: (n) => `${n} ${n === 1 ? 'artículo' : 'artículos'}`,
    totalLabel: (n) => `${n} ${n === 1 ? 'artículo' : 'artículos'}`,
    emptyAll: 'Los artículos se están organizando. Consulta el directorio Skill para ver las herramientas disponibles.',
    emptySection: 'Esta categoría se está organizando. Prueba con otra.',
    breadcrumbHome: 'Inicio',
    breadcrumbPosts: 'Artículos',
    readMore: 'Ver más',
    ctaTitle: 'Mantén tu material organizado',
    ctaBody:
      'Un artículo solo marca el rumbo; antes de postular necesitas tu propia experiencia, proyectos y puesto objetivo. La app Mui reúne ese material en una biblioteca local.',
    ctaLink: 'Descargar la app de escritorio',
    footerCopyright: '© 2026 MuiCV',
  },
  pt: {
    brand: 'MuiCV',
    navHome: 'Início',
    navPosts: 'Artigos',
    eyebrow: 'Posts',
    allLabel: 'Todos',
    sections: { jobs: 'Carreira', product: 'Produto', guide: 'Guias' },
    sectionDescs: {
      jobs: 'Artigos práticos sobre recrutamento, currículo, entrevista e oferta.',
      product: 'Reflexões de produto, recursos e uso do MuiCV.',
      guide: 'Guias passo a passo, da instalação à revisão da entrevista.',
    },
    allTitle: 'Todos os artigos',
    allDescription: 'Artigos sobre currículo, carreira, entrevista, oferta e agentes de IA.',
    countLabel: (n) => `${n} ${n === 1 ? 'artigo' : 'artigos'}`,
    totalLabel: (n) => `${n} ${n === 1 ? 'artigo' : 'artigos'}`,
    emptyAll: 'Os artigos estão sendo organizados. Veja o diretório Skill para as ferramentas disponíveis.',
    emptySection: 'Esta categoria está sendo organizada. Tente outra.',
    breadcrumbHome: 'Início',
    breadcrumbPosts: 'Artigos',
    readMore: 'Ler mais',
    ctaTitle: 'Mantenha seu material organizado',
    ctaBody:
      'Um artigo só aponta o caminho; antes de se candidatar você precisa da sua experiência, dos seus projetos e do cargo-alvo. O app Mui reúne esse material em uma biblioteca local.',
    ctaLink: 'Baixar o app para desktop',
    footerCopyright: '© 2026 MuiCV',
  },
  th: {
    brand: 'MuiCV',
    navHome: 'หน้าแรก',
    navPosts: 'บทความ',
    eyebrow: 'Posts',
    allLabel: 'ทั้งหมด',
    sections: { jobs: 'การหางาน', product: 'ผลิตภัณฑ์', guide: 'คู่มือ' },
    sectionDescs: {
      jobs: 'บทความปฏิบัติเกี่ยวกับการสมัครงาน เรซูเม่ สัมภาษณ์ และข้อเสนองาน',
      product: 'แนวคิดผลิตภัณฑ์ ความสามารถ และวิธีใช้ MuiCV',
      guide: 'คู่มือทีละขั้น ตั้งแต่ติดตั้งจนถึงทบทวนการสัมภาษณ์',
    },
    allTitle: 'บทความทั้งหมด',
    allDescription: 'บทความเกี่ยวกับเรซูเม่ การหางาน สัมภาษณ์ ข้อเสนองาน และ AI agent',
    countLabel: (n) => `${n} บทความ`,
    totalLabel: (n) => `ทั้งหมด ${n} บทความ`,
    emptyAll: 'บทความกำลังอยู่ระหว่างการจัดเตรียม ดูเครื่องมือที่มีได้ที่ไดเรกทอรี Skill',
    emptySection: 'หมวดนี้กำลังอยู่ระหว่างการจัดเตรียม ลองดูหมวดอื่น',
    breadcrumbHome: 'หน้าแรก',
    breadcrumbPosts: 'บทความ',
    readMore: 'อ่านเพิ่มเติม',
    ctaTitle: 'จัดระเบียบข้อมูลของคุณต่อไป',
    ctaBody:
      'บทความเพียงบอกทิศทาง ก่อนสมัครคุณยังต้องกลับไปที่ประสบการณ์ โปรเจกต์ และตำแหน่งเป้าหมายของตัวเอง แอป Mui เก็บข้อมูลเหล่านี้ไว้ในคลังในเครื่องเดียว',
    ctaLink: 'ดาวน์โหลดแอปเดสก์ท็อป',
    footerCopyright: '© 2026 MuiCV',
  },
  vi: {
    brand: 'MuiCV',
    navHome: 'Trang chủ',
    navPosts: 'Bài viết',
    eyebrow: 'Posts',
    allLabel: 'Tất cả',
    sections: { jobs: 'Tìm việc', product: 'Sản phẩm', guide: 'Hướng dẫn' },
    sectionDescs: {
      jobs: 'Bài viết thực hành về tuyển dụng, CV, phỏng vấn và thư mời làm việc.',
      product: 'Tư duy sản phẩm, tính năng và cách dùng MuiCV.',
      guide: 'Hướng dẫn từng bước, từ cài đặt đến nhìn lại buổi phỏng vấn.',
    },
    allTitle: 'Tất cả bài viết',
    allDescription: 'Bài viết về CV, tìm việc, phỏng vấn, thư mời làm việc và AI agent.',
    countLabel: (n) => `${n} bài viết`,
    totalLabel: (n) => `${n} bài viết`,
    emptyAll: 'Bài viết đang được sắp xếp. Xem thư mục Skill để biết các công cụ hiện có.',
    emptySection: 'Chuyên mục này đang được sắp xếp. Hãy thử chuyên mục khác.',
    breadcrumbHome: 'Trang chủ',
    breadcrumbPosts: 'Bài viết',
    readMore: 'Đọc thêm',
    ctaTitle: 'Tiếp tục sắp xếp tư liệu của bạn',
    ctaBody:
      'Bài viết chỉ cho bạn hướng đi; trước khi ứng tuyển bạn vẫn cần kinh nghiệm, dự án và vị trí mục tiêu của chính mình. Ứng dụng Mui lưu những tư liệu đó trong một thư viện cục bộ.',
    ctaLink: 'Tải ứng dụng desktop',
    footerCopyright: '© 2026 MuiCV',
  },
};
