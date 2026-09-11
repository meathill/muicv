import type { LocaleContent } from './locale-content';
import type { Dictionary } from './types';

// Dicionário em português. Copy de marketing nativa, não tradução literal.
// O FAQ em acordeão (JSX) fica em `content.faq`, ver _sections/faq-items.tsx.

const faqLink =
  'font-semibold text-yellow-deep underline decoration-corgi decoration-2 underline-offset-4 hover:decoration-yellow';

export const dict: Dictionary = {
  brand: { name: 'MuiCV', by: 'by Mui 🐾' },
  nav: {
    links: [
      { label: 'Modelos', href: '/templates' },
      { label: 'Artigos', href: '/posts/jobs' },
      { label: 'Skills', href: '/skills' },
      { label: 'Preços', href: '/pricing' },
      { label: 'Baixar', href: '/download' },
    ],
    console: 'Abrir console',
    signIn: 'Entrar',
    signUp: 'Criar conta',
  },
  footer: {
    tagline:
      'A plataforma de busca de emprego com IA tudo em um. Currículo, vagas, entrevistas simuladas e mentoria de carreira — para você conquistar uma oferta melhor.',
    curatedBy: 'Revisado pela corgi Mui',
    cols: [
      {
        label: 'Produto',
        links: [
          { label: 'Principais recursos', href: '/#features' },
          { label: 'Modelos de currículo', href: '/templates' },
          { label: 'Preços', href: '/pricing' },
          { label: 'App para desktop', href: '/download' },
          { label: 'Catálogo de Skills', href: '/skills' },
          { label: 'Console', href: '/dashboard' },
        ],
      },

      {
        label: 'Conteúdo',
        links: [
          { label: 'Artigos de carreira', href: '/posts/jobs' },
          { label: 'Todos os artigos', href: '/posts' },
          { label: 'Novidades', href: '/changelog' },
        ],
      },
      {
        label: 'Empresa',
        links: [
          { label: 'Sobre nós', href: '/about' },
          { label: 'Fale conosco', href: '/contact' },
        ],
      },
      {
        label: 'Legal',
        links: [
          { label: 'Termos de serviço', href: '/terms' },
          { label: 'Política de privacidade', href: '/privacy' },
        ],
      },
    ],
    copyright: '© 2026 Meathill LLC · MuiCV · Todos os direitos reservados',
    madeIn: 'Feito com 🐾 na China',
  },
  hero: {
    badge: 'App para desktop já disponível — comece com um único material',
    titleA: 'Deixe seu currículo e sua experiência ',
    titleHighlight: 'nas mãos da Mui',
    titleEnd: '.',
    lede: 'Baixe o app para desktop e importe seu currículo atual ou cole uma experiência. A Mui primeiro organiza tudo em uma biblioteca de carreira reutilizável e depois gera, revisa e exporta um currículo sob medida para cada vaga.',
    ctaDownload: 'Baixar app para desktop',
    ctaSteps: 'Ver os 3 passos',
    accountSignedIn: 'Ir para o painel',
    accountSignedOut: 'Criar conta',
    agentNote:
      'Já está acostumado com Claude Code, Codex ou Cursor? A opção de instalar via skill fica mais abaixo na página — continue com as ferramentas que você já usa.',
  },
  heroShowcase: {
    tabsAria: 'Alternar demonstração',
    slides: { import: 'Importar', library: 'Biblioteca', resume: 'Personalizar' },
    caption: 'Organize primeiro, depois itere por vaga',
    importHeader: 'MuiCV · Passo 1',
    importTitle: 'Comece com algo real',
    importDesc:
      'Envie um currículo, cole uma experiência ou simplesmente diga “quero começar do zero”. A Mui parte do que você já tem.',
    importItems: [
      { title: 'curriculo.pdf', desc: 'Convertido em material editável' },
      { title: 'Uma história de projeto', desc: 'Preencha contexto, ação e resultado' },
      { title: 'Link da vaga desejada', desc: 'Usado depois para gerar versões' },
    ],
    libraryHeader: 'Biblioteca de carreira',
    libraryNavLabel: 'Navegação',
    libraryNav: ['Experiência', 'Projetos', 'Skills', 'Vagas'],
    libraryListLabel: 'Material reutilizável',
    libraryItems: [
      { title: 'Liderei a plataforma de crescimento de assinantes', match: 'Quantificado' },
      { title: 'Reconstruí o pipeline de releases do frontend', match: 'Pronto' },
      { title: 'Impulsei padrões de tracking entre times', match: 'A fazer' },
    ],
  },
  features: {
    eyebrow: 'O que ele faz',
    titleA: 'Organize primeiro o material, ',
    titleHighlight: 'depois personalize',
    titleEnd: '.',
    lede: 'O diferencial da Mui não é inventar histórias para você — é organizar a experiência real em material reutilizável e ajustar a redação para cada vaga.',
    statusLive: 'Disponível',
    statusSoon: 'Em breve',
    items: [
      {
        id: 'organize',
        title: 'Organizar material de carreira',
        desc: 'Transforme seu currículo atual, projetos, skills e destaques em material reutilizável. Cada candidatura parte da mesma base.',
        status: 'live',
        highlights: ['Importar currículo', 'Preencher lacunas', 'Arquivos locais'],
      },
      {
        id: 'generate',
        title: 'Gerar por vaga',
        desc: 'Dê à Mui uma vaga desejada e ela seleciona, ordena e reescreve o conteúdo da biblioteca em uma versão de currículo que combina melhor.',
        status: 'live',
        highlights: ['Crawler de vagas', 'Score de aderência', 'Versionamento'],
      },
      {
        id: 'review',
        title: 'Revisar e exportar',
        desc: 'Confira o rascunho em STAR, métricas, palavras-chave e extensão, depois exporte um PDF A4 — menos correria na hora de se candidatar.',
        status: 'live',
        highlights: ['Revisão em 7 pontos', 'Sugestões de edição', 'Exportação em PDF'],
      },
      {
        id: 'practice',
        title: 'Continue praticando',
        desc: 'Com o material estável, siga com entrevistas simuladas, cartas de apresentação e um checklist de candidaturas. Recursos avançados aparecem quando você precisar.',
        status: 'soon',
        highlights: ['Entrevista simulada', 'Carta de apresentação', 'Checklist de candidaturas'],
      },
    ],
  },
  workflow: {
    eyebrow: 'Como começar',
    titleA: 'Ao abrir pela primeira vez, ',
    titleHighlight: 'faça só três coisas',
    titleEnd: '.',
    aside:
      'Conclua seu primeiro material de carreira — não precisa entender todos os recursos agora. As versões de currículo, o match com vagas e a exportação crescem a partir daqui.',
    steps: [
      {
        title: 'Importe um currículo ou cole uma experiência',
        desc: 'Sem aprender conceitos antes. Coloque um PDF, documento ou uma história de projeto que você já tem, e a Mui começa do material real.',
      },
      {
        title: 'Organize em uma biblioteca reutilizável',
        desc: 'Experiências, projetos e skills viram arquivos Markdown salvos no seu próprio computador. Nada de recomeçar toda vez que editar.',
      },
      {
        title: 'Gere, revise e exporte por vaga',
        desc: 'Com a biblioteca pronta, cole o link ou a descrição da vaga; a Mui gera uma versão, verifica problemas e exporta um PDF pronto para enviar.',
      },
    ],
  },
  desktopApp: {
    badge: 'App para desktop · Disponível',
    titleA: 'Não conhece agentes de IA?',
    titleHighlight: 'Basta baixar',
    titleEnd: '.',
    lede: 'App para desktop multiplataforma. Ele guia você para importar um currículo ou registrar sua primeira experiência e depois seguir para o match de vagas, a revisão do currículo e a exportação em PDF.',
    ctaDownload: 'Baixar app para desktop',
    ctaAdvanced: 'Já usa um agente de IA? Caminho avançado ↓',
    platforms: [
      { name: 'macOS', sub: 'Apple Silicon · Intel' },
      { name: 'Windows', sub: 'x64 · instalador NSIS' },
      { name: 'Linux', sub: 'x86_64 · AppImage' },
    ],
    downloadLabel: 'Baixar',
    noteBefore: 'A versão e o tamanho do instalador vêm automaticamente da ',
    noteLink: 'página de download',
    noteAfter:
      ', que puxa os últimos GitHub Releases. Se o sistema bloquear a primeira execução, a parte de baixo da página de download explica como liberar.',
  },
  install: {
    badge: 'Caminho avançado · para quem conhece ferramentas de IA',
    titleA: 'Já usa Claude Code / Codex?',
    titleHighlight: 'Basta instalar a skill',
    titleEnd: '.',
    lede: 'Este é o caminho avançado, para quem já trabalha dentro de um agente de IA. Quem só procura emprego tem uma experiência mais suave com o app para desktop.',
    noteBefore: 'Não conhece agentes de IA? ',
    noteLink: 'Baixe o app para desktop',
    noteAfter: ' e comece agora — disponível para macOS / Windows / Linux.',
    cardMeta: 'Funciona com vários agentes / 40+ compatíveis',
  },
  faq: {
    eyebrow: 'Perguntas frequentes',
    titleA: 'O que você quer saber está ',
    titleHighlight: 'provavelmente',
    titleEnd: ' aqui.',
    articlesEyebrow: 'Artigos de carreira',
    articlesTitle: 'Currículo, entrevista e oferta — leia um artigo quando travar.',
    articlesLede:
      'Uma coletânea dos pontos que mais travam na busca: como revisar o currículo, como se preparar para a entrevista e como avaliar se vale a pena a oportunidade.',
    articlesCta: 'Ir para o conteúdo',
    articlesEmpty: 'Os artigos ainda estão em produção. Enquanto isso, veja as seções já abertas no conteúdo.',
  },
  download: {
    eyebrow: 'App para desktop',
    title: 'Baixar o MuiCV',
    lede: 'Não precisa instalar o Claude Code nem entender de skills. Abra o app, importe um currículo ou registre sua primeira experiência, e a Mui guia você até uma biblioteca de carreira que pode evoluir sempre.',
    firstMinuteLabel: 'Seu primeiro minuto após baixar',
    firstMinuteSteps: [
      {
        title: 'Entre na sua conta muicv',
        desc: 'Autorize pelo navegador e o app volta automaticamente ao estado de login.',
      },
      {
        title: 'Importe um currículo ou comece do zero',
        desc: 'Envie um currículo atual ou descreva um projeto e uma experiência que você viveu.',
      },
      {
        title: 'Comece sua primeira conversa de organização',
        desc: 'A Mui divide o material em partes reutilizáveis primeiro e depois gera versões por vaga.',
      },
    ],
    releasedAt: 'Publicado em',
    platforms: [
      { title: 'macOS · Apple Silicon', subtitle: 'M1 / M2 / M3 / M4', key: 'mac-arm64' },
      { title: 'macOS · Intel', subtitle: 'x64 (Macs antigos)', key: 'mac-x64' },
      { title: 'Windows', subtitle: 'x64 · instalador NSIS', key: 'win' },
      { title: 'Linux', subtitle: 'x86_64 · AppImage', key: 'linux' },
    ],
    unsignedNote:
      'Nenhuma build tem assinatura de código ainda, então a primeira execução exige liberação manual conforme os passos abaixo; essa etapa some quando os certificados de desenvolvedor entrarem.',
    noArch: 'Esta versão não tem artefato para essa arquitetura',
    downloadLabel: 'Baixar',
    noReleaseLead: '🐾 O app para desktop não consegue buscar uma versão agora. Enquanto isso, você pode:',
    noReleaseSkill:
      'Já usa um agente de IA como Claude Code, Codex ou Cursor? Veja o comando de instalação da skill na página inicial — leva 5 segundos para integrar',
    noReleaseContactBefore: 'Dúvidas ou feedback? ',
    noReleaseContactLink: 'Fale conosco',
    firstRunTitle: '⚠️ A primeira abertura precisa de liberação',
    firstRunLede:
      'Nenhuma das três plataformas tem assinatura de código, então o sistema vai bloquear. Siga os passos uma vez para liberar; depois basta dar dois cliques ou rodar direto pela linha de comando.',
    firstRunMacSteps: [
      'Arraste o .dmg para /Applications',
      <>
        <strong>Clique com o botão direito</strong> (ou control-click) no app → <strong>Abrir</strong>
      </>,
      'Depois do aviso, clique em “Abrir” de novo; a partir daí o duplo clique funciona',
    ],
    firstRunMacCliLabel: 'Versão de linha de comando (sem interface gráfica):',
    firstRunMacCli: 'xattr -d com.apple.quarantine /Applications/Mui简历.app',
    firstRunWinSteps: [
      'Dê dois cliques no .exe baixado',
      <>
        Apareceu o aviso do SmartScreen → clique em <strong>Mais informações</strong> → clique em{' '}
        <strong>Executar mesmo assim</strong>
      </>,
      'Escolha o caminho de instalação; por padrão vai para a pasta do usuário, sem senha de administrador',
    ],
    firstRunLinuxLede: 'Depois de baixar o .AppImage, dê permissão de execução e rode direto:',
  },
  meta: {
    home: {
      title: 'MuiCV — Gerador de currículo com IA | Modelos para desenvolvedores e currículo online',
      description:
        'MuiCV (muicv.com) é o gerador de currículo com IA e a plataforma de busca de emprego tudo em um: modelos de currículo para desenvolvedores, criação de currículo online, otimização inteligente de palavras-chave para ATS e exportação em PDF A4. Seus dados ficam locais, com privacidade e segurança.',
    },
    download: {
      title: 'Baixar o app MuiCV para desktop (macOS / Windows / Linux)',
      description:
        'Baixe o app MuiCV para desktop, compatível com macOS, Windows e Linux. Importe um currículo ou cole sua experiência, organize o material de carreira localmente e use a IA para gerar, revisar e exportar um currículo em PDF sob medida para cada vaga. Download gratuito, dados armazenados localmente.',
    },
  },
};

export const content: LocaleContent = {
  about: {
    meta: {
      title: 'Sobre nós',
      description:
        'Queremos criar uma ferramenta que realmente ajuda você a conquistar uma oferta, e não mais um gerador de modelos de currículo.',
    },
    heroEyebrow: 'Sobre',
    heroTitleLead: 'Uma ferramenta que realmente conquista a ',
    heroTitleHighlight: 'oferta',
    heroTitleMid: ',',
    heroTitleTail: 'não apenas mais um gerador de modelos.',
    heroLede:
      'O MuiCV é uma plataforma de busca de emprego com IA tudo em um: da organização das suas experiências passadas à descoberta das vagas certas, currículo sob medida, entrevistas simuladas e cartas de apresentação — tudo voltado para conquistar seu próximo emprego, e não apenas produzir um PDF bonito.',
    doEyebrow: 'O que fazemos',
    doTitle: 'O caminho completo do material até a oferta.',
    doCards: [
      {
        t: 'Não só currículo',
        d: 'O currículo é apenas a porta de entrada. O que importa é o que de fato decide a oferta: match com a vaga, preparação para a entrevista e estratégia de busca.',
      },
      {
        t: 'Seus dados são seus',
        d: 'Todo o material fica em arquivos Markdown no seu próprio computador ou projeto. Sem “cofre de currículos” na nuvem, sem prender seus dados.',
      },
      {
        t: 'Não inventamos nada',
        d: 'Tudo é estritamente baseado nos fatos que você escreve. Faltou material? Perguntamos ou deixamos em branco — nunca “criamos” por você, para o currículo não te derrubar na entrevista.',
      },
    ],
    whyEyebrow: 'Por que fizemos',
    whyTitle: 'Procurar emprego não deveria ser tão difícil.',
    whyParagraphs: [
      'Já vimos candidatos excelentes afundarem por causa do currículo: trabalho incrível mal explicado, um modelo atrás do outro, uma noite inteira ajustando para a descrição da vaga e ainda sem saber se valia a pena se candidatar.',
      'A maioria das ferramentas de currículo resolve só o “visual bonito”, mas a verdadeira dificuldade está nas duas pontas: no começo, “o que eu tenho de concreto para contar”; e no fim, “qual vaga combina comigo e o que preciso preparar para a entrevista”.',
      'Queremos uma ferramenta para todo o caminho, fazendo cada etapa sem enrolação: desde a primeira experiência que você escreve até o dia em que recebe a oferta.',
    ],
    teamEyebrow: 'Equipe',
    teamTitle: 'Uma corgi e um engenheiro.',
    teamPara1: (
      <>
        Começado por <strong className="text-ink">meathill</strong> (um desenvolvedor com anos de frontend), com
        curadoria da corgi <strong className="text-ink">Mui</strong> — a cachorrinha amarela e branca do meathill, que
        faz a curadoria deitando no teclado e influenciando os merges.
      </>
    ),
    teamPara2:
      'Mais pessoas vão se juntar, mas a intenção original não muda: fazer ferramentas, não truques de marketing; colocar a experiência do usuário e a posse dos dados em primeiro lugar.',
    ctaTitle: 'Encontre seu próximo emprego, começando por aqui.',
    ctaSignedIn: 'Ir para o painel',
    ctaSignedOut: 'Começar de graça',
    ctaContact: 'Fale conosco',
  },
  contact: {
    meta: {
      title: 'Fale conosco',
      description: 'Feedback do produto, parcerias e imprensa — encontre a caixa certa para uma resposta mais rápida.',
    },
    heroEyebrow: 'Contato',
    heroTitleLead: 'Quer nos ',
    heroTitleHighlight: 'contar algo',
    heroTitleTail: '?',
    heroLede:
      'Lemos todos os e-mails. Normalmente respondemos em 1–3 dias úteis; em períodos de pico pode demorar um pouco mais, mas você sempre receberá resposta.',
    contacts: [
      {
        label: 'Contato geral',
        tag: 'Feedback / suporte ao usuário',
        email: 'hi@muicv.com',
        desc: 'Dúvidas de uso, relatos de bugs, sugestões de recursos — qualquer questão sobre o produto vem para cá.',
      },
      {
        label: 'Parcerias',
        tag: 'Empresas / times / parceiros',
        email: 'partner@muicv.com',
        desc: 'Compras em volume para times, parcerias com instituições de ensino, integrações com plataformas de vagas — assuntos comerciais vêm para cá e têm resposta mais rápida.',
      },
      {
        label: 'Imprensa',
        tag: 'Entrevista / cobertura / marca',
        email: 'press@muicv.com',
        desc: 'Convites para entrevista, materiais de mídia e pedidos de ativos da marca. Faça um breve resumo do foco da matéria e responderemos em breve.',
      },
    ],
    noteStrong: 'Quer testar direto?',
    noteLink: 'Baixe o app para desktop',
    noteAfter: 'e comece agora — disponível para macOS / Windows / Linux.',
  },
  pricing: {
    meta: {
      title: 'Preços',
      description:
        'Pagamento por token, sem validade. Ganhe 10K tokens ao se registrar; escolha mensal, anual ou pacotes avulsos.',
    },
    heroEyebrow: 'Preços',
    heroTitleLead: 'Pagamento por ',
    heroTitleHighlight: 'token',
    heroTitleMid: ', ',
    heroTitleTail: 'sem validade.',
    heroLede:
      'Ganhe 10.000 tokens ao se registrar (uma vez). Quando acabar, assine o plano mensal ou anual, ou compre um pacote a qualquer momento. As skills são sempre gratuitas e o BYOK está sempre disponível.',
    toggleMonthly: 'Mensal',
    toggleYearly: 'Anual',
    toggleSavings: 'economize ≈17%',
    free: {
      title: 'Comece de graça',
      sub: 'Quer testar? Comece por aqui.',
      grantNote: 'No cadastro · uma vez',
      bullets: [
        'Todos os serviços na nuvem (LLM / PDF / JD)',
        'Gerenciamento local de material ilimitado',
        'Conecte o BYOK para usar o LLM “sem limite”',
        'Quando acabar, compre um pacote ou assine — o saldo nunca expira',
      ],
      ctaSignedIn: 'Ir para o painel',
      ctaSignedOut: 'Cadastre-se e ganhe 10K tokens',
    },
    tokenLineYearly: 'Ano inteiro de uma vez:',
    tokenLineMonthly: 'Renovação automática mensal:',
    tiers: {
      pro: {
        tagline: 'Para uma busca séria.',
        badge: 'Mais popular',
        features: [
          'Todos os recursos (LLM / PDF / JD / biblioteca de vagas) distribuídos livremente por token',
          'Cancele quando quiser — os tokens concedidos nunca expiram',
          'Suporte prioritário por e-mail',
        ],
      },
      max: {
        tagline: 'Para uma busca intensa.',
        features: ['Tudo do Pro', 'Acesso antecipado a novos módulos', 'Canal de suporte dedicado'],
      },
    },
    cardPerYear: 'Anual',
    cardPerMonth: 'Mensal',
    signUpToSubscribe: 'Cadastre-se para assinar',
    manageSub: 'Gerenciar assinatura',
    subscribeNow: 'Assinar',
    cnBuyPrefix: 'Comprar ',
    cnPackNote: (days) =>
      `Pagamento avulso (China) · uma compra por usuário a cada ciclo de ${days} dias · tokens nunca expiram`,
    topupHeading: 'Pacotes avulsos (compra única, nunca expiram)',
    topupDesc: 'Não quer assinar agora ou só passou do limite uma vez. Compre quando quiser.',
    buyNow: 'Comprar agora',
    signUpToBuy: 'Cadastre-se para comprar',
    faqEyebrow: 'Sobre os preços',
    faqTitle: 'Alguns detalhes que costumam perguntar.',
    faq: [
      {
        q: 'Como o MuiCV cobra?',
        a: 'As chamadas de LLM são registradas pelos tokens de prompt + completion do provedor e convertidas conforme o nosso preço (as partes em cache também seguem o preço do provedor); cada renderização de PDF custa 200 tokens; cada extração de JD custa 300 tokens. Toda chamada aparece no extrato do seu console.',
      },
      {
        q: 'Qual a diferença entre mensal e anual?',
        a: 'O anual é cerca de 17% mais barato e concede o ano inteiro de tokens de uma vez — usável desde o primeiro dia. Ao cancelar, todos os tokens concedidos permanecem, sem expirar. O mensal é bom para testar; o anual, para quem quer se comprometer a longo prazo.',
      },
      {
        q: 'Posso usar assinatura e pacotes avulsos juntos?',
        a: 'Sim. A assinatura renova automaticamente a cada período; os pacotes avulsos são adicionados manualmente quando o saldo baixa. Os tokens dos dois entram no mesmo saldo, sem ordem específica de uso.',
      },
      {
        q: 'Posso mudar de plano / cancelar quando quiser?',
        a: 'Sim. “Gerenciar assinatura” no console abre o Stripe Customer Portal — cancelar, trocar de plano ou alterar a forma de pagamento, tudo por lá. Os tokens concedidos nunca expiram; após cancelar, você continua usando o saldo antigo. A cobrança é pelo uso real, nunca duplicada.',
      },
      {
        q: 'Usuários gratuitos recebem tokens renovados todo mês?',
        a: 'Não. O cadastro concede 10.000 tokens uma única vez. Quando acabar, compre um pacote avulso (o mais barato é ¥10 = 10K tokens), assine mensal / anual ou use o BYOK para o LLM rodar na sua própria API (PDF / JD continuam debitando tokens do muicv).',
      },
      {
        q: 'E se eu não gostar, tem reembolso?',
        a: 'Assinaturas são totalmente reembolsáveis em até 7 dias, se os principais recursos não tiverem sido usados — fale por e-mail. Pacotes avulsos são creditados na hora e, em princípio, não são reembolsáveis; em caso de compra por engano ou problema grave, fale por e-mail que resolvemos.',
      },
      {
        q: 'Comprei API em outro lugar — ainda preciso pagar?',
        a: 'Você pode usar apenas o BYOK: vincule o endereço e a chave da sua API no console e todas as chamadas de LLM usam o saldo da sua própria API, sem consumir tokens do muicv. Mas serviços de valor agregado, como renderização de PDF e extração de JD, continuam debitando tokens do muicv (só nós podemos oferecê-los).',
      },
      {
        q: 'Não sei onde comprar API — tem alguma recomendação?',
        a: 'Eu também desenvolvi o muirouter — todo ele usa IA original, compatível com os principais produtos. Se você usa IA em mais de um lugar e quer aproveitar melhor seu orçamento de IA, vale experimentar: https://muirouter.com.',
      },
      {
        q: 'Quais as vantagens do BYOK?',
        a: 'Se nenhum dos nossos planos serve — pouco ou demais — ou se você usa mais de um produto de IA, considere o BYOK. Assim, o que sobrar de cota por aqui pode ser usado nos seus outros produtos de IA.',
      },
      {
        q: 'O kit de skills em si é cobrado?',
        a: 'Não. Instalar com npx skills add em qualquer agente de IA (Claude Code / Codex / Cursor, etc.) é totalmente gratuito — a cobrança da plataforma vale apenas para recursos do lado do servidor (exportar PDF / buscar vagas).',
      },
    ],
  },
  faq: [
    {
      q: 'Onde ficam os dados do meu currículo? Quem pode vê-los?',
      a: (
        <>
          Tudo fica no seu próprio computador — em arquivos Markdown puros, sob seu controle total. Se quer fazer backup
          ou compartilhar com alguém, a decisão é sua. Nossos servidores só tocam nos dados brevemente quando você
          aciona recursos como exportar PDF ou buscar vagas, e descartam tudo em seguida, sem armazenar nenhum conteúdo
          do seu currículo.
        </>
      ),
      text: 'Tudo fica no seu próprio computador — em arquivos Markdown puros, sob seu controle total. Se quer fazer backup ou compartilhar com alguém, a decisão é sua. Nossos servidores só tocam nos dados brevemente quando você aciona recursos como exportar PDF ou buscar vagas, e descartam tudo em seguida, sem armazenar nenhum conteúdo do seu currículo.',
    },
    {
      q: 'Quanto custa?',
      a: (
        <>
          Uma carteira única de tokens:
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>10.000 tokens de presente no cadastro</strong>, sem validade, até acabar
            </li>
            <li>
              <strong>Assinatura</strong>: Pro / Max, mensal ou anual, com renovação automática de tokens a cada
              período; o anual concede o ano inteiro de uma vez, cerca de 17% de desconto
            </li>
            <li>
              <strong>Pacotes avulsos</strong>: compre 10K / 35K / 130K tokens avulsos, quando quiser
            </li>
            <li>
              <strong>BYOK</strong>: vincule sua própria API e chave no console para o LLM usar seu saldo; PDF / JD
              continuam debitando tokens do muicv
            </li>
          </ul>
          Serviços na nuvem (exportar PDF, buscar vagas, etc.) são cobrados por token. Veja os preços na{' '}
          <a href="/pricing" className={faqLink}>
            página de preços
          </a>
          .
        </>
      ),
      text: 'Uma carteira única de tokens: 10.000 tokens de presente no cadastro, sem validade; assinaturas Pro / Max mensal ou anual com renovação automática de tokens a cada período, anual com cerca de 17% de desconto; pacotes avulsos de 10K / 35K / 130K tokens; o BYOK permite vincular sua própria chave de API para o LLM usar seu saldo. Serviços na nuvem (exportar PDF, buscar vagas, etc.) são cobrados por token — veja a página de preços.',
    },
    {
      q: 'O que é BYOK?',
      a: (
        <>
          BYOK = Bring Your Own Key, ou seja, use seu próprio saldo de LLM. Depois de vincular, todas as chamadas de IA
          usam o seu saldo e nós não consumimos mais tokens da plataforma — ideal para quem já tem assinatura de um
          serviço de LLM e quer unificar o controle de custos.
        </>
      ),
      text: 'BYOK = Bring Your Own Key, ou seja, use seu próprio saldo de LLM. Depois de vincular, todas as chamadas de IA usam o seu saldo e nós não consumimos mais tokens da plataforma — ideal para quem já tem assinatura de um serviço de LLM e quer unificar o controle de custos.',
    },
    {
      q: 'Quando o app para desktop será lançado?',
      a: (
        <>
          <strong>Já está disponível</strong>, para macOS / Windows / Linux. Acesse a{' '}
          <a href="/download" className={faqLink}>
            página de download
          </a>{' '}
          para pegar a versão mais recente. Quem já usa um agente de IA (Claude Code / Codex / Cursor, etc.) também pode
          integrar direto pelo kit de skills — escolha um dos caminhos.
        </>
      ),
      text: 'Já está disponível para macOS / Windows / Linux; acesse a página de download para pegar a versão mais recente. Quem já usa um agente de IA (Claude Code / Codex / Cursor, etc.) também pode integrar direto pelo kit de skills — escolha um dos caminhos.',
    },
    {
      q: 'Suporta currículo em inglês / bilíngue?',
      a: (
        <>
          Sim. Escreva o material no idioma que preferir; o currículo gerado acompanha a vaga — uma vaga em inglês gera
          um currículo em estilo inglês. Modelos bilíngues lado a lado estão no roadmap.
        </>
      ),
      text: 'Sim. Escreva o material no idioma que preferir; o currículo gerado acompanha a vaga — uma vaga em inglês gera um currículo em estilo inglês. Modelos bilíngues lado a lado estão no roadmap.',
    },
    {
      q: 'Ele se candidata automaticamente ao LinkedIn / sites de vagas?',
      a: (
        <>
          Não. Ajudamos apenas a buscar vagas, gerar currículos direcionados, escrever cartas de apresentação e
          organizar um checklist — o “clicar em enviar” é com você. Isso é intencional, para evitar riscos à conta e
          violações dos termos de uso.
        </>
      ),
      text: 'Não. Ajudamos apenas a buscar vagas, gerar currículos direcionados, escrever cartas de apresentação e organizar um checklist — o “clicar em enviar” é com você. Isso é intencional, para evitar riscos à conta e violações dos termos de uso.',
    },
    {
      q: 'Para quem é o MuiCV?',
      a: (
        <>
          Para quem está procurando emprego e revisa o currículo muitas vezes — recém-formados, quem está trocando de
          emprego, quem está migrando de carreira ou quem se candidata a muitas vagas ao mesmo tempo. Já usa um agente
          de IA como Claude Code ou Cursor? Integre a skill. Não quer mexer com linha de comando? Baixe o app para
          desktop. Você traz a experiência; a Mui transforma tudo em um currículo que combina com a vaga.
        </>
      ),
      text: 'Para quem está procurando emprego e revisa o currículo muitas vezes — recém-formados, quem está trocando de emprego, quem está migrando de carreira ou quem se candidata a muitas vagas ao mesmo tempo. Já usa um agente de IA como Claude Code ou Cursor? Integre a skill. Não quer mexer com linha de comando? Baixe o app para desktop. Você traz a experiência; a Mui transforma tudo em um currículo que combina com a vaga.',
    },
    {
      q: 'A IA otimiza / modifica meu currículo?',
      a: (
        <>
          Sim, mas apenas com base nos fatos que você fornece. A Mui avalia o rascunho por STAR, resultados
          quantificados, palavras-chave da vaga e extensão; aponta frases vagas, trechos sem dados e palavras-chave não
          cobertas; e sugere reescritas prontas para usar. Cole a descrição da vaga desejada e ela ainda re-seleciona e
          reescreve o material para aquela vaga. Nunca inventa experiências.
        </>
      ),
      text: 'Sim, mas apenas com base nos fatos que você fornece. A Mui avalia o rascunho por STAR, resultados quantificados, palavras-chave da vaga e extensão; aponta frases vagas, trechos sem dados e palavras-chave não cobertas; e sugere reescritas prontas para usar. Cole a descrição da vaga desejada e ela ainda re-seleciona e reescreve o material para aquela vaga. Nunca inventa experiências.',
    },
    {
      q: 'Qual é o site oficial do MuiCV?',
      a: (
        <>
          Só existe um: <strong>muicv.com</strong> — www.muicv.com redireciona para cá. Existem ferramentas de currículo
          com nomes parecidos, mas sem relação com a gente; salve muicv.com nos favoritos e você nunca vai errar.
        </>
      ),
      text: 'Só existe um: muicv.com — www.muicv.com redireciona para cá. Existem ferramentas de currículo com nomes parecidos, mas sem relação com a gente; salve muicv.com nos favoritos e você nunca vai errar.',
    },
  ],
};
