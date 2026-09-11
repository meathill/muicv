import type { LocaleContent } from './locale-content';
import type { Dictionary } from './types';

// Español. Textos de marketing nativos, no traducción literal.
// El acordeón de FAQ (JSX) y el contenido de páginas viven en `content`, ver locale-content.ts.

export const dict: Dictionary = {
  brand: { name: 'MuiCV', by: 'by Mui 🐾' },
  nav: {
    links: [
      { label: 'Plantillas', href: '/templates' },
      { label: 'Artículos', href: '/posts/jobs' },
      { label: 'Skills', href: '/skills' },
      { label: 'Precios', href: '/pricing' },
      { label: 'Descargar', href: '/download' },
    ],
    console: 'Abrir panel',
    signIn: 'Iniciar sesión',
    signUp: 'Crear cuenta',
  },
  footer: {
    tagline:
      'La plataforma integral de búsqueda de empleo con IA. Currículum, búsqueda de puestos, entrevistas simuladas y orientación laboral — para que consigas una mejor oferta.',
    curatedBy: 'Supervisado por Mui, la corgi',
    cols: [
      {
        label: 'Producto',
        links: [
          { label: 'Funciones', href: '/#features' },
          { label: 'Plantillas de currículum', href: '/templates' },
          { label: 'Precios', href: '/pricing' },
          { label: 'App de escritorio', href: '/download' },
          { label: 'Catálogo de skills', href: '/skills' },
          { label: 'Panel', href: '/dashboard' },
        ],
      },

      {
        label: 'Contenido',
        links: [
          { label: 'Artículos de empleo', href: '/posts/jobs' },
          { label: 'Todos los artículos', href: '/posts' },
          { label: 'Novedades', href: '/changelog' },
        ],
      },
      {
        label: 'Empresa',
        links: [
          { label: 'Sobre nosotros', href: '/about' },
          { label: 'Contacto', href: '/contact' },
        ],
      },
      {
        label: 'Legal',
        links: [
          { label: 'Términos del servicio', href: '/terms' },
          { label: 'Privacidad', href: '/privacy' },
        ],
      },
    ],
    copyright: '© 2026 Meathill LLC · MuiCV · Todos los derechos reservados',
    madeIn: 'Hecho con 🐾 en China',
  },
  hero: {
    badge: 'La app de escritorio ya está disponible — empieza con un solo material',
    titleA: 'Pon tu currículum y tu experiencia ',
    titleHighlight: 'en manos de Mui',
    titleEnd: '.',
    lede: 'Descarga la app de escritorio e importa tu currículum actual o pega una experiencia. Mui primero lo organiza en una biblioteca profesional reutilizable y después genera, revisa y exporta un currículum a medida para cada puesto.',
    ctaDownload: 'Descargar la app de escritorio',
    ctaSteps: 'Ver los 3 pasos',
    accountSignedIn: 'Ir a mi panel',
    accountSignedOut: 'Crear cuenta',
    agentNote:
      '¿Ya te manejas con Claude Code, Codex o Cursor? Más abajo en la página está la instalación del skill, para que sigas con tus herramientas de siempre.',
  },
  heroShowcase: {
    tabsAria: 'Cambiar demo',
    slides: { import: 'Importar', library: 'Biblioteca', resume: 'Personalizar' },
    caption: 'Primero ordena, luego itera por puesto',
    importHeader: 'MuiCV · Paso 1',
    importTitle: 'Primero, algo real',
    importDesc:
      'Sube un currículum, pega una experiencia o simplemente di “quiero empezar desde cero”. Mui parte de lo que ya tienes.',
    importItems: [
      { title: 'curriculum.pdf', desc: 'Se convierte en material editable' },
      { title: 'Una historia de proyecto', desc: 'Completa contexto, acción y resultado' },
      { title: 'Enlace al puesto objetivo', desc: 'Se usará luego para generar versiones' },
    ],
    libraryHeader: 'Biblioteca profesional',
    libraryNavLabel: 'Navegación',
    libraryNav: ['Experiencia', 'Proyectos', 'Skills', 'Puestos'],
    libraryListLabel: 'Material reutilizable',
    libraryItems: [
      { title: 'Lideré la plataforma de crecimiento de miembros', match: 'Cuantificado' },
      { title: 'Reconstruí el pipeline de publicación del frontend', match: 'Listo' },
      { title: 'Impulsé estándares de tracking entre equipos', match: 'Pendiente' },
    ],
  },
  features: {
    eyebrow: 'Qué hace',
    titleA: 'Primero ordena tu material,',
    titleHighlight: 'luego personaliza',
    titleEnd: '.',
    lede: 'Lo esencial de Mui no es inventarte una historia, sino convertir tu experiencia real en material reutilizable y después ajustar la redacción a cada puesto.',
    statusLive: 'Disponible',
    statusSoon: 'Próximamente',
    items: [
      {
        id: 'organize',
        title: 'Ordena tu material profesional',
        desc: 'Divide tu currículum, proyectos, skills y logros actuales en material reutilizable. Cada postulación parte del mismo borrador base.',
        status: 'live',
        highlights: ['Importar currículum', 'Completar lagunas', 'Archivos locales'],
      },
      {
        id: 'generate',
        title: 'Genera por puesto',
        desc: 'Dale a Mui un puesto objetivo y seleccionará, ordenará y reescribirá desde tu biblioteca para crear una versión del currículum que encaje mejor.',
        status: 'live',
        highlights: ['Extracción de ofertas', 'Puntuación de match', 'Versionado'],
      },
      {
        id: 'review',
        title: 'Revisa y exporta',
        desc: 'Revisa el borrador según STAR, métricas, palabras clave y extensión, y exporta un PDF A4 — para no improvisar justo antes de postular.',
        status: 'live',
        highlights: ['Revisión de 7 puntos', 'Sugerencias de edición', 'Exportar a PDF'],
      },
      {
        id: 'practice',
        title: 'Sigue practicando la búsqueda',
        desc: 'Cuando el material esté estable, continúa con entrevistas simuladas, cartas de presentación y un checklist de postulación. Las funciones avanzadas aparecen cuando las necesitas.',
        status: 'soon',
        highlights: ['Entrevista simulada', 'Carta de presentación', 'Checklist de postulación'],
      },
    ],
  },
  workflow: {
    eyebrow: 'Cómo empezar',
    titleA: 'La primera vez que lo abras,',
    titleHighlight: 'solo tres cosas',
    titleEnd: '.',
    aside:
      'Termina primero tu primer material profesional, sin prisa por entender todas las funciones. Las versiones del currículum, el match con puestos y la exportación crecen desde aquí.',
    steps: [
      {
        title: 'Importa un currículum o pega una experiencia',
        desc: 'No hace falta aprender conceptos antes. Pon un PDF, un documento o una historia de proyecto que ya tengas, y Mui empieza con material real.',
      },
      {
        title: 'Organízalo en una biblioteca reutilizable',
        desc: 'La experiencia, los proyectos y las skills se convierten en archivos Markdown guardados en tu propia computadora. Nada de empezar de cero cada vez.',
      },
      {
        title: 'Genera, revisa y exporta por puesto',
        desc: 'Con la biblioteca lista, pega el enlace o la descripción de un puesto; Mui genera una versión, revisa posibles problemas y exporta un PDF listo para enviar.',
      },
    ],
  },
  desktopApp: {
    badge: 'App de escritorio · Disponible',
    titleA: '¿Nuevo con los agentes de IA?',
    titleHighlight: 'Basta con descargar',
    titleEnd: '.',
    lede: 'Una app de escritorio multiplataforma. Te guía para importar un currículum o registrar tu primera experiencia, y luego sigue con el match de puestos, la revisión del currículum y la exportación a PDF.',
    ctaDownload: 'Descargar la app de escritorio',
    ctaAdvanced: '¿Ya usas un agente de IA? Ruta avanzada ↓',
    platforms: [
      { name: 'macOS', sub: 'Apple Silicon · Intel' },
      { name: 'Windows', sub: 'x64 · instalador NSIS' },
      { name: 'Linux', sub: 'x86_64 · AppImage' },
    ],
    downloadLabel: 'Descargar',
    noteBefore: 'La versión y el tamaño del instalador se toman de ',
    noteLink: 'la página de descarga',
    noteAfter:
      ' automáticamente desde las últimas GitHub Releases. Si tu sistema bloquea el primer inicio, la segunda mitad de la página de descarga explica cómo permitirlo.',
  },
  install: {
    badge: 'Ruta avanzada · para quienes conocen las herramientas de IA',
    titleA: '¿Ya usas Claude Code / Codex?',
    titleHighlight: 'Solo instala el skill',
    titleEnd: '.',
    lede: 'Esta es la ruta avanzada, para quien ya trabaja dentro de un agente de IA. A quien busca empleo de forma normal le resultará más fácil la app de escritorio.',
    noteBefore: '¿Nuevo con los agentes de IA? ',
    noteLink: 'Descarga la app de escritorio',
    noteAfter: ' y empieza ya — disponible en macOS / Windows / Linux.',
    cardMeta: 'Compatible con varios agentes / 40+',
  },
  faq: {
    eyebrow: 'Preguntas frecuentes',
    titleA: 'Lo que te preguntas',
    titleHighlight: 'seguramente',
    titleEnd: ' está aquí.',
    articlesEyebrow: 'Artículos de empleo',
    articlesTitle: 'Currículum, entrevistas y ofertas: lee un artículo cuando te atasques.',
    articlesLede:
      'Una colección de los obstáculos más comunes en la búsqueda: cómo mejorar el currículum, cómo preparar una entrevista, cómo juzgar si vale la pena una oportunidad.',
    articlesCta: 'Ir al centro de contenido',
    articlesEmpty:
      'Los artículos siguen en preparación. Puedes ver en el centro de contenido las secciones que ya están abiertas.',
  },
  download: {
    eyebrow: 'App de escritorio',
    title: 'Descargar MuiCV',
    lede: 'No hace falta instalar Claude Code ni entender los skills primero. Abre la app, importa un currículum o registra tu primera experiencia, y Mui te guiará hasta una biblioteca profesional que podrás seguir mejorando.',
    firstMinuteLabel: 'Tu primer minuto tras descargar',
    firstMinuteSteps: [
      {
        title: 'Inicia sesión con tu cuenta muicv',
        desc: 'Completa la autorización en el navegador; la app volverá sola al estado de sesión iniciada.',
      },
      {
        title: 'Importa un currículum o empieza desde cero',
        desc: 'Sube tu currículum actual o simplemente describe un proyecto y una experiencia que hayas tenido.',
      },
      {
        title: 'Empieza tu primera conversación de organización',
        desc: 'Mui primero divide tu material en piezas reutilizables y después genera versiones por puesto.',
      },
    ],
    releasedAt: 'Publicado',
    platforms: [
      { title: 'macOS · Apple Silicon', subtitle: 'M1 / M2 / M3 / M4', key: 'mac-arm64' },
      { title: 'macOS · Intel', subtitle: 'x64 (Macs antiguos)', key: 'mac-x64' },
      { title: 'Windows', subtitle: 'x64 · instalador NSIS', key: 'win' },
      { title: 'Linux', subtitle: 'x86_64 · AppImage', key: 'linux' },
    ],
    unsignedNote:
      'Ninguna compilación está firmada digitalmente todavía, así que el primer inicio requiere autorizarla manualmente según los pasos de abajo; este paso desaparecerá cuando incorporemos los certificados de desarrollador.',
    noArch: 'Esta versión no incluye un artefacto para esa arquitectura',
    downloadLabel: 'Descargar',
    noReleaseLead: '🐾 La app de escritorio no puede obtener una versión en este momento. Mientras tanto puedes:',
    noReleaseSkill:
      'Si ya usas un agente de IA como Claude Code, Codex o Cursor, mira el comando de instalación del skill en la página de inicio — se integra en 5 segundos',
    noReleaseContactBefore: '¿Dudas o comentarios? ',
    noReleaseContactLink: 'Contáctanos',
    firstRunTitle: '⚠️ La primera apertura requiere desbloquearla',
    firstRunLede:
      'Ninguna de las tres plataformas está firmada digitalmente, así que el sistema te detendrá. Autorízala una vez siguiendo los pasos de abajo; después bastará con doble clic o ejecutarla desde la terminal.',
    firstRunMacSteps: [
      'Arrastra el .dmg a /Applications',
      <>
        Haz <strong>clic derecho</strong> (o control-clic) en la app → <strong>Abrir</strong>
      </>,
      'Tras el aviso, pulsa “Abrir” otra vez; a partir de ahí funcionará el doble clic',
    ],
    firstRunMacCliLabel: 'Versión de línea de comandos (sin GUI):',
    firstRunMacCli: 'xattr -d com.apple.quarantine /Applications/Mui简历.app',
    firstRunWinSteps: [
      'Haz doble clic en el .exe descargado',
      <>
        Aparece la advertencia de SmartScreen → pulsa <strong>Más información</strong> → pulsa{' '}
        <strong>Ejecutar de todos modos</strong>
      </>,
      'Elige la ruta de instalación; por defecto se instala en tu carpeta de usuario, sin contraseña de administrador',
    ],
    firstRunLinuxLede: 'Tras descargar el .AppImage, dale permisos de ejecución y ejecútalo directamente:',
  },
  meta: {
    home: {
      title: 'MuiCV — Generador de currículums con IA | Plantillas para programadores y CV en inglés online',
      description:
        'La web oficial de MuiCV (muicv.com) es un generador de currículums con IA y espacio de trabajo para la búsqueda de empleo: plantillas para programadores, creación de currículums en inglés online, optimización inteligente de palabras clave ATS y exportación a PDF A4. Tus materiales bajo tu control, con privacidad y seguridad.',
    },
    download: {
      title: 'Descargar la app de escritorio MuiCV (macOS / Windows / Linux)',
      description:
        'Descarga la app de escritorio de MuiCV para macOS, Windows y Linux. Importa un currículum o pega una experiencia, organiza tu material profesional en local y luego genera, revisa y exporta con IA un currículum en PDF. Descarga gratuita, datos en local.',
    },
  },
};

const faqLink =
  'font-semibold text-yellow-deep underline decoration-corgi decoration-2 underline-offset-4 hover:decoration-yellow';

export const content: LocaleContent = {
  about: {
    meta: {
      title: 'Sobre nosotros',
      description:
        'Queremos una herramienta que de verdad te ayude a conseguir una oferta, no otro generador de plantillas de currículum.',
    },
    heroEyebrow: 'Sobre nosotros',
    heroTitleLead: 'Una herramienta que de verdad te ayuda a conseguir la ',
    heroTitleHighlight: 'oferta',
    heroTitleMid: ', ',
    heroTitleTail: 'no otro generador de plantillas.',
    heroLede:
      'MuiCV es una plataforma integral de búsqueda de empleo con IA: desde organizar tu experiencia pasada hasta encontrar los puestos adecuados, personalizar currículums, hacer entrevistas simuladas y escribir cartas de presentación — todo enfocado en conseguir tu próximo trabajo, no solo en producir un PDF bonito.',
    doEyebrow: 'Qué hacemos',
    doTitle: 'El camino completo del material a la oferta.',
    doCards: [
      {
        t: 'No solo currículums',
        d: 'El currículum es solo la puerta de entrada. Nos importa lo que de verdad decide la oferta: el match con el puesto, la preparación de la entrevista y la estrategia de búsqueda.',
      },
      {
        t: 'Tus datos, tuyos',
        d: 'Todo el material vive como archivos Markdown en tu propia computadora o proyecto. Sin “caja fuerte de currículums” en la nube, sin encerrar tus datos.',
      },
      {
        t: 'No inventamos nada',
        d: 'Todo se basa estrictamente en los hechos que tú escribes. Si falta material, preguntamos o lo dejamos en blanco — nunca “creamos” por ti, para que tu currículum no te juegue en contra en la entrevista.',
      },
    ],
    whyEyebrow: 'Por qué lo creamos',
    whyTitle: 'Buscar trabajo no debería ser tan difícil.',
    whyParagraphs: [
      'Hemos visto a demasiados candidatos excelentes hundirse por el currículum: un trabajo impresionante pero mal contado, una plantilla tras otra, una noche entera ajustándolo a una oferta sin saber si conviene postular.',
      'La mayoría de las herramientas de currículum solo resuelven “que se vea ordenado”, pero la dificultad real está en los dos extremos: al principio, “qué tengo realmente que contar”, y al final, “qué puesto me conviene y qué preparar para la entrevista”.',
      'Queremos una herramienta para todo el recorrido, que haga cada paso sin chapuzas: desde la primera experiencia que escribes hasta el día en que recibes la oferta.',
    ],
    teamEyebrow: 'Equipo',
    teamTitle: 'Una corgi y un ingeniero.',
    teamPara1: (
      <>
        Iniciado por <strong className="text-ink">meathill</strong> (un desarrollador con años de experiencia en
        frontend), supervisado por la corgi <strong className="text-ink">Mui</strong> — la perra amarilla y blanca de
        meathill, que supervisa el producto tumbándose sobre el teclado e influyendo en los merges.
      </>
    ),
    teamPara2:
      'Con el tiempo se sumarán más compañeros, pero la intención original no cambiará: hacer herramientas, no trucos de marketing; poner la experiencia de usuario y la soberanía de los datos por delante.',
    ctaTitle: 'Encuentra tu próximo empleo, empieza aquí.',
    ctaSignedIn: 'Ir al panel',
    ctaSignedOut: 'Empezar gratis',
    ctaContact: 'Contáctanos',
  },
  contact: {
    meta: {
      title: 'Contacto',
      description:
        'Comentarios sobre el producto, alianzas, prensa — escribe al correo correcto y recibirás respuesta antes.',
    },
    heroEyebrow: 'Contacto',
    heroTitleLead: '¿Quieres ',
    heroTitleHighlight: 'contarnos algo',
    heroTitleTail: '?',
    heroLede:
      'Leemos todos los correos. Normalmente respondemos en 1–3 días hábiles; en temporada alta algo más lento, pero siempre recibirás respuesta.',
    contacts: [
      {
        label: 'General',
        tag: 'Comentarios / soporte',
        email: 'hi@muicv.com',
        desc: 'Dudas de uso, reportes de errores, ideas de funciones — todo lo relacionado con el producto va aquí.',
      },
      {
        label: 'Alianzas',
        tag: 'Empresas / equipos / socios',
        email: 'partner@muicv.com',
        desc: 'Planes por volumen para equipos, alianzas educativas, integraciones con plataformas de empleo — los temas comerciales van a este correo y reciben respuesta antes.',
      },
      {
        label: 'Prensa',
        tag: 'Entrevistas / cobertura / marca',
        email: 'press@muicv.com',
        desc: 'Solicitudes de entrevista, material para medios y recursos de marca. Cuéntanos brevemente tu enfoque y te responderemos pronto.',
      },
    ],
    noteStrong: '¿Quieres probarlo directamente?',
    noteLink: 'Descarga la app de escritorio',
    noteAfter: ' y empieza ya — disponible en macOS / Windows / Linux.',
  },
  pricing: {
    meta: {
      title: 'Precios',
      description:
        'Pago por token, sin caducidad. Al registrarte recibes 10K tokens gratis; elige pago mensual, anual o packs de recarga puntuales.',
    },
    heroEyebrow: 'Precios',
    heroTitleLead: 'Pago por ',
    heroTitleHighlight: 'token',
    heroTitleMid: ', ',
    heroTitleTail: 'sin caducidad.',
    heroLede:
      'Al registrarte recibes 10.000 tokens gratis (una sola vez). Cuando se te acaben, suscríbete mensual o anualmente, o compra un pack de recarga cuando quieras. Los skills son siempre gratis y BYOK siempre está disponible.',
    toggleMonthly: 'Mensual',
    toggleYearly: 'Anual',
    toggleSavings: 'ahorra ≈9%',
    free: {
      title: 'Empieza gratis',
      sub: '¿Quieres probarlo? Empieza por aquí.',
      grantNote: 'Al registrarte · una sola vez',
      bullets: [
        'Todos los servicios en la nube (LLM / PDF / JD) disponibles',
        'Gestión local de material ilimitada',
        'Conecta BYOK para un uso “ilimitado” del LLM',
        'Cuando se acabe, compra un pack o suscríbete — el saldo nunca caduca',
      ],
      ctaSignedIn: 'Ir al panel',
      ctaSignedOut: 'Regístrate gratis y recibe 10K tokens',
    },
    tokenLineYearly: 'Unos 11 meses por adelantado:',
    tokenLineMonthly: 'Recarga mensual automática:',
    tiers: {
      pro: {
        tagline: 'Para una búsqueda seria.',
        badge: 'El más popular',
        features: [
          'Todas las funciones (LLM / PDF / JD / bolsa de empleo) repartidas libremente por token',
          'Cancela cuando quieras — los tokens otorgados nunca caducan',
          'Soporte prioritario por correo',
        ],
      },
      max: {
        tagline: 'Para una búsqueda intensiva.',
        features: ['Todo lo de Pro', 'Acceso anticipado a nuevos módulos', 'Canal de soporte exclusivo'],
      },
    },
    cardPerYear: 'Anual',
    cardPerMonth: 'Mensual',
    signUpToSubscribe: 'Suscríbete tras registrarte',
    manageSub: 'Gestionar suscripción',
    subscribeNow: 'Suscribirme',
    cnSubscribeHint:
      'Las suscripciones no están disponibles en CNY (limitación de Stripe). Cambia a $ USD para suscribirte o compra un pack de recarga abajo.',
    switchToUsd: 'Cambiar a USD',
    topupHeading: 'Packs de recarga (pago puntual, sin caducidad)',
    topupDesc: 'No quieres suscribirte o solo te pasaste una vez. Cómpralos cuando quieras.',
    buyNow: 'Comprar ahora',
    signUpToBuy: 'Compra tras registrarte',
    faqEyebrow: 'Sobre los precios',
    faqTitle: 'Algunos detalles que suelen preguntar.',
    faq: [
      {
        q: '¿Cómo factura MuiCV?',
        a: 'Las llamadas al LLM se registran directamente por los tokens de prompt y completion del proveedor y se convierten según nuestro precio, incluida la parte en caché, que también se factura a la tarifa del proveedor; el renderizado de PDF cuesta 200 tokens cada vez; la extracción de JD cuesta 300 tokens cada vez. Todas las llamadas aparecen detalladas en el historial del panel.',
      },
      {
        q: '¿Cuál es la diferencia entre el pago mensual y el anual?',
        a: 'El anual tiene cerca de un 9% de descuento; además, entrega de una vez unos 11 meses de tokens, así que puedes usarlos desde el día del pago. Si cancelas, todos los tokens otorgados se conservan y nunca caducan. El mensual va bien para probar y el anual para comprometerse a largo plazo.',
      },
      {
        q: '¿Puedo usar la suscripción y los packs de recarga a la vez?',
        a: 'Sí. La suscripción se recarga automáticamente cada periodo y los packs se añaden manualmente cuando los necesitas. Los tokens de ambas fuentes van al mismo saldo y se usan sin un orden fijo.',
      },
      {
        q: '¿Puedo subir, bajar de plan o cancelar cuando quiera?',
        a: 'Sí. “Gestionar suscripción” en el panel abre el Stripe Customer Portal: ahí cancelas, cambias de plan o modificas el método de pago. Los tokens otorgados nunca caducan; tras cancelar sigues usando tu saldo anterior. El cobro se liquida según el uso real, sin duplicados.',
      },
      {
        q: '¿Los usuarios Free reciben tokens cada mes?',
        a: 'No. Al registrarte recibes 10.000 tokens una sola vez, y ya está. Cuando se acaben, puedes comprar un pack de recarga (el más barato, ¥12.88 = 140K tokens), suscribirte mensual o anualmente, o usar BYOK para que el LLM funcione con tu propia API (PDF / JD siguen descontando tokens de muicv).',
      },
      {
        q: '¿Hay reembolso si no quedo satisfecho?',
        a: 'Las suscripciones se reembolsan por completo dentro de los 7 días si no has usado las funciones principales — escríbenos. Los packs de recarga se acreditan al instante y en principio no son reembolsables; si fue una compra por error o hay un problema grave, escríbenos y lo resolvemos.',
      },
      {
        q: 'Compré API en otro sitio, ¿aun así tengo que pagar?',
        a: 'Puedes usar solo BYOK: conecta la dirección y la clave de tu API en el panel, y todas las llamadas al LLM usarán tu propio saldo sin consumir tokens de muicv. Pero los servicios de valor añadido como el renderizado de PDF o la extracción de JD seguirán descontando tokens de muicv (esos servicios solo los podemos ofrecer nosotros).',
      },
      {
        q: 'No sé dónde comprar API, ¿tienes alguna recomendación?',
        a: 'También desarrollé muirouter, todo con IA de proveedores originales y compatible con los principales productos. Si usas IA en más de un sitio y quieres aprovechar mejor tu presupuesto, te recomiendo probarlo: https://muirouter.com.',
      },
      {
        q: '¿Qué ventajas tiene BYOK?',
        a: 'Si ninguno de nuestros planes te convence — porque te parece poco o demasiado — o si usas más de un producto de IA, puedes plantearte BYOK. Así, la cuota que no gastes aquí podrás destinarla a tus otros productos de IA.',
      },
      {
        q: '¿El propio kit de skills tiene coste?',
        a: 'No. Instalar npx skills add en cualquier agente de IA (Claude Code / Codex / Cursor, etc.) es totalmente gratis — la facturación de la plataforma solo se aplica a las capacidades del servidor (exportar a PDF / buscar empleo).',
      },
    ],
  },
  faq: [
    {
      q: '¿Dónde se guardan los datos de mi currículum? ¿Quién puede verlos?',
      a: (
        <>
          Todo se guarda en tu propia computadora, como archivos Markdown sin procesar, bajo tu control total. Si
          quieres hacer una copia de seguridad o compartirlos con alguien, tú decides. Nuestros servidores solo tocan
          los datos brevemente cuando llamas activamente a funciones como exportar a PDF o extraer ofertas, y los
          descartan al terminar: no conservamos ningún contenido de tu currículum.
        </>
      ),
      text: 'Todo se guarda en tu propia computadora, como archivos Markdown sin procesar, bajo tu control total. Si quieres hacer una copia de seguridad o compartirlos con alguien, tú decides. Nuestros servidores solo tocan los datos brevemente cuando llamas activamente a funciones como exportar a PDF o extraer ofertas, y los descartan al terminar: no conservamos ningún contenido de tu currículum.',
    },
    {
      q: '¿Cuánto cuesta?',
      a: (
        <>
          Un único monedero de tokens:
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Al registrarte recibes 10.000 tokens una sola vez</strong>, sin caducidad, hasta agotarlos
            </li>
            <li>
              <strong>Suscripción</strong>: Pro / Max mensual o anual, con recarga automática de tokens cada periodo; el
              anual entrega unos 11 meses de una vez, con ≈9% de descuento
            </li>
            <li>
              <strong>Packs de recarga</strong>: compra puntual de 140K / 480K / 1.75M tokens, cuando quieras
            </li>
            <li>
              <strong>BYOK</strong>: conecta la dirección y la clave de tu propia API en el panel para que el LLM use tu
              saldo; PDF / JD siguen descontando tokens de muicv
            </li>
          </ul>
          Los servicios en la nube (exportar a PDF, buscar empleo, etc.) se cobran por token. Consulta los precios en la{' '}
          <a href="/pricing" className={faqLink}>
            página de precios
          </a>
          .
        </>
      ),
      text: 'Un único monedero de tokens: al registrarte recibes 10.000 tokens una sola vez, sin caducidad; suscripciones Pro / Max mensuales o anuales con recarga automática de tokens cada periodo, el anual con ≈9% de descuento; packs de recarga puntuales de 140K / 480K / 1.75M tokens; BYOK conecta tu propia clave de API para que el LLM use tu saldo. Los servicios en la nube (exportar a PDF, buscar empleo, etc.) se cobran por token; consulta los detalles en la página de precios.',
    },
    {
      q: '¿Qué es BYOK?',
      a: (
        <>
          BYOK = Bring Your Own Key, es decir, tu propio saldo de LLM. Una vez conectado, todas las llamadas de IA usan
          tu saldo y nosotros dejamos de consumir tokens de la plataforma — ideal si ya tienes una suscripción a un
          servicio de LLM y quieres controlar el coste de forma unificada.
        </>
      ),
      text: 'BYOK = Bring Your Own Key, es decir, tu propio saldo de LLM. Una vez conectado, todas las llamadas de IA usan tu saldo y nosotros dejamos de consumir tokens de la plataforma — ideal si ya tienes una suscripción a un servicio de LLM y quieres controlar el coste de forma unificada.',
    },
    {
      q: '¿Cuándo se publica la app de escritorio?',
      a: (
        <>
          <strong>Ya está disponible</strong>, en macOS / Windows / Linux. Ve a la{' '}
          <a href="/download" className={faqLink}>
            página de descarga
          </a>{' '}
          para obtener la última versión. Quien ya use un agente de IA (Claude Code / Codex / Cursor, etc.) también
          puede integrarse directamente con el kit de skills; cualquiera de las dos opciones sirve.
        </>
      ),
      text: 'Ya está disponible, en macOS / Windows / Linux; ve a la página de descarga para obtener la última versión. Quien ya use un agente de IA (Claude Code / Codex / Cursor, etc.) también puede integrarse directamente con el kit de skills. Cualquiera de las dos opciones sirve.',
    },
    {
      q: '¿Admite currículums en inglés o bilingües?',
      a: (
        <>
          Sí. Si tu material está en un idioma, el currículum saldrá en ese idioma; si el puesto objetivo es en inglés,
          el currículum generado se escribirá con estilo inglés; las plantillas bilingües ya están en planificación.
        </>
      ),
      text: 'Sí. Si tu material está en un idioma, el currículum saldrá en ese idioma; si el puesto objetivo es en inglés, el currículum generado se escribirá con estilo inglés; las plantillas bilingües ya están en planificación.',
    },
    {
      q: '¿Se postula automáticamente en LinkedIn / Boss 直聘?',
      a: (
        <>
          No. Solo te ayudamos a extraer ofertas, generar currículums a medida, escribir cartas de presentación y
          organizar un checklist — el botón de “enviar” lo pulsas tú. Es intencional, para evitar riesgos de cuenta y
          violaciones de los términos de servicio.
        </>
      ),
      text: 'No. Solo te ayudamos a extraer ofertas, generar currículums a medida, escribir cartas de presentación y organizar un checklist — el botón de “enviar” lo pulsas tú. Es intencional, para evitar riesgos de cuenta y violaciones de los términos de servicio.',
    },
    {
      q: '¿Para quién es MuiCV?',
      a: (
        <>
          Para quien busca empleo y necesita reescribir el currículum una y otra vez: recién titulados, quienes cambian
          de trabajo, quienes se reinventan profesionalmente o quienes postulan a muchos puestos a la vez. Si ya usas un
          agente de IA como Claude Code o Cursor, puedes conectar el skill directamente; si no quieres complicarte con
          la terminal, descarga la app de escritorio. Tú aportas la experiencia, Mui la convierte en un currículum que
          encaja con el puesto.
        </>
      ),
      text: 'Para quien busca empleo y necesita reescribir el currículum una y otra vez: recién titulados, quienes cambian de trabajo, quienes se reinventan profesionalmente o quienes postulan a muchos puestos a la vez. Si ya usas un agente de IA como Claude Code o Cursor, puedes conectar el skill directamente; si no quieres complicarte con la terminal, descarga la app de escritorio. Tú aportas la experiencia, Mui la convierte en un currículum que encaja con el puesto.',
    },
    {
      q: '¿La IA optimiza o modifica mi currículum?',
      a: (
        <>
          Sí, pero solo a partir de los hechos que tú aportas. Mui revisa el borrador según STAR, resultados
          cuantificados, palabras clave del puesto y extensión; señala qué frase es demasiado vaga, qué sección carece
          de datos y qué palabras clave no están cubiertas, y ofrece reescrituras listas para usar. Si pegas la
          descripción del puesto objetivo, además vuelve a seleccionar y reescribir el material para ese puesto. Nunca
          inventa experiencia.
        </>
      ),
      text: 'Sí, pero solo a partir de los hechos que tú aportas. Mui revisa el borrador según STAR, resultados cuantificados, palabras clave del puesto y extensión; señala qué frase es demasiado vaga, qué sección carece de datos y qué palabras clave no están cubiertas, y ofrece reescrituras listas para usar. Si pegas la descripción del puesto objetivo, además vuelve a seleccionar y reescribir el material para ese puesto. Nunca inventa experiencia.',
    },
    {
      q: '¿Cuál es la web oficial de MuiCV?',
      a: (
        <>
          Solo hay una: <strong>muicv.com</strong>, y www.muicv.com redirige automáticamente a ella. El nombre del
          producto en inglés es MuiCV. En internet hay herramientas de currículum con nombres parecidos que no tienen
          relación con nosotros; si guardas o buscas muicv.com, siempre llegarás al sitio correcto.
        </>
      ),
      text: 'Solo hay una: muicv.com, y www.muicv.com redirige automáticamente a ella. El nombre del producto en inglés es MuiCV. En internet hay herramientas de currículum con nombres parecidos que no tienen relación con nosotros; si guardas o buscas muicv.com, siempre llegarás al sitio correcto.',
    },
  ],
};
