import type { LocaleContent } from './locale-content';
import type { Dictionary } from './types';

// Dictionnaire français : copy marketing native, pas une traduction littérale.
// Les Q&R de la FAQ (JSX) vivent dans `content.faq` ci-dessous.

const faqLink =
  'font-semibold text-yellow-deep underline decoration-corgi decoration-2 underline-offset-4 hover:decoration-yellow';

export const dict: Dictionary = {
  brand: { name: 'MuiCV', by: 'by Mui 🐾' },
  nav: {
    links: [
      { label: 'Modèles', href: '/templates' },
      { label: 'Articles', href: '/posts/jobs' },
      { label: 'Skills', href: '/skills' },
      { label: 'Tarifs', href: '/pricing' },
      { label: 'Télécharger', href: '/download' },
    ],
    console: 'Ouvrir la console',
    signIn: 'Se connecter',
    signUp: 'Créer un compte',
  },
  footer: {
    tagline:
      "La plateforme IA tout-en-un pour votre recherche d'emploi. CV, recherche de postes, entretiens blancs et coaching carrière — pour décrocher une meilleure offre.",
    curatedBy: 'Supervisé par Mui le corgi',
    cols: [
      {
        label: 'Produit',
        links: [
          { label: 'Fonctionnalités clés', href: '/#features' },
          { label: 'Modèles de CV', href: '/templates' },
          { label: 'Tarifs', href: '/pricing' },
          { label: 'App de bureau', href: '/download' },
          { label: 'Catalogue de Skills', href: '/skills' },
          { label: 'Console', href: '/dashboard' },
        ],
      },

      {
        label: 'Contenu',
        links: [
          { label: 'Articles emploi', href: '/posts/jobs' },
          { label: 'Tous les articles', href: '/posts' },
          { label: 'Journal des mises à jour', href: '/changelog' },
        ],
      },
      {
        label: 'Entreprise',
        links: [
          { label: 'À propos', href: '/about' },
          { label: 'Nous contacter', href: '/contact' },
        ],
      },
      {
        label: 'Mentions légales',
        links: [
          { label: "Conditions d'utilisation", href: '/terms' },
          { label: 'Politique de confidentialité', href: '/privacy' },
        ],
      },
    ],
    copyright: '© 2026 Meathill LLC · MuiCV · Tous droits réservés',
    madeIn: 'Conçu avec 🐾 en Chine',
  },
  hero: {
    badge: "L'app de bureau est disponible — commencez par une seule expérience",
    titleA: 'Confiez votre CV et vos expériences ',
    titleHighlight: 'à Mui',
    titleEnd: '.',
    lede: "Téléchargez l'app de bureau, importez votre CV existant ou collez une expérience. Mui commence par l'organiser dans une bibliothèque de carrière réutilisable, puis génère, évalue et exporte un CV adapté à chaque poste.",
    ctaDownload: "Télécharger l'app de bureau",
    ctaSteps: 'Voir les 3 étapes',
    accountSignedIn: 'Accéder au tableau de bord',
    accountSignedOut: 'Créer un compte',
    agentNote:
      "Déjà à l'aise avec Claude Code, Codex ou Cursor ? Le parcours d'installation du skill se trouve plus bas dans la page — gardez votre outillage habituel.",
  },
  heroShowcase: {
    tabsAria: 'Changer la démo',
    slides: { import: 'Importer', library: 'Bibliothèque', resume: 'Sur mesure' },
    caption: "Organisez d'abord, puis adaptez selon le poste",
    importHeader: 'MuiCV · Étape 1',
    importTitle: 'Commencez par une matière réelle',
    importDesc:
      'Importez un CV, collez une expérience, ou dites simplement « Je veux partir de zéro ». Mui part de ce que vous avez déjà.',
    importItems: [
      { title: 'cv-existant.pdf', desc: 'Analysé en matière modifiable' },
      { title: 'Une expérience de projet', desc: 'Complétez contexte, action, résultat' },
      { title: 'Lien du poste visé', desc: 'Sert ensuite à générer des versions' },
    ],
    libraryHeader: 'Bibliothèque de carrière',
    libraryNavLabel: 'Navigation',
    libraryNav: ['Expériences', 'Projets', 'Compétences', 'Postes'],
    libraryListLabel: 'Matière réutilisable',
    libraryItems: [
      { title: 'Direction de la plateforme de croissance des membres', match: 'Quantifié' },
      { title: 'Refonte du pipeline de release frontend', match: 'Prêt' },
      { title: 'Standardisation du tracking entre équipes', match: 'À compléter' },
    ],
  },
  features: {
    eyebrow: 'Ce que ça fait',
    titleA: "Mettez d'abord de l'ordre dans vos expériences, ",
    titleHighlight: 'puis adaptez',
    titleEnd: '.',
    lede: "Le cœur de Mui n'est pas d'inventer une histoire à votre place, mais d'organiser votre expérience réelle en matière réutilisable, puis d'ajuster le discours selon chaque poste.",
    statusLive: 'Disponible',
    statusSoon: 'Bientôt disponible',
    items: [
      {
        id: 'organize',
        title: 'Organiser vos expériences',
        desc: 'Découpez votre CV, vos projets, vos compétences et vos réussites en matière réutilisable. Chaque candidature part de la même base.',
        status: 'live',
        highlights: ['Importer un CV', 'Combler les manques', 'Fichiers locaux'],
      },
      {
        id: 'generate',
        title: 'Générer selon le poste',
        desc: 'Donnez un poste cible à Mui : il sélectionne, classe et réécrit vos contenus pour produire une version de CV plus pertinente.',
        status: 'live',
        highlights: ['Extraction de postes', 'Score de correspondance', 'Gestion des versions'],
      },
      {
        id: 'review',
        title: 'Évaluer et exporter',
        desc: 'Vérifiez vos brouillons selon STAR, les résultats chiffrés, les mots-clés et la longueur, puis exportez un PDF A4 — fini le stress de dernière minute avant de postuler.',
        status: 'live',
        highlights: ['Évaluation en 7 points', 'Suggestions de réécriture', 'Export PDF'],
      },
      {
        id: 'practice',
        title: 'Continuer à préparer votre recherche',
        desc: 'Une fois vos expériences stables, enchaînez avec les entretiens blancs, les lettres de motivation et une checklist de candidature. Les fonctions avancées apparaissent quand vous en avez besoin.',
        status: 'soon',
        highlights: ['Entretiens blancs', 'Lettre de motivation', 'Checklist de candidature'],
      },
    ],
  },
  workflow: {
    eyebrow: 'Comment commencer',
    titleA: 'À la première ouverture, ',
    titleHighlight: 'seulement trois choses',
    titleEnd: '.',
    aside:
      "Commencez par votre première expérience professionnelle — inutile de tout comprendre tout de suite. Les versions de CV, le matching de postes et l'export se construisent à partir de là.",
    steps: [
      {
        title: 'Importez un CV ou collez une expérience',
        desc: 'Aucun concept à apprendre. Déposez un PDF, un document ou une expérience de projet que vous avez déjà, et Mui part de matière réelle.',
      },
      {
        title: 'Organisez-les en bibliothèque réutilisable',
        desc: 'Vos expériences, projets et compétences deviennent des fichiers Markdown stockés sur votre ordinateur. Plus besoin de repartir de zéro à chaque modification.',
      },
      {
        title: 'Générez, évaluez et exportez selon le poste',
        desc: 'Une fois la bibliothèque en place, collez un lien ou une description de poste : Mui génère une version, vérifie les problèmes et exporte un PDF prêt à envoyer.',
      },
    ],
  },
  desktopApp: {
    badge: 'App de bureau · Disponible',
    titleA: 'Pas familier avec les agents IA ? ',
    titleHighlight: "Téléchargez, c'est parti",
    titleEnd: '.',
    lede: "Une app de bureau multiplateforme. À l'ouverture, elle vous guide pour importer un CV ou enregistrer votre première expérience, puis vous accompagne vers le matching de postes, l'évaluation de CV et l'export PDF.",
    ctaDownload: "Télécharger l'app de bureau",
    ctaAdvanced: 'Vous utilisez déjà un agent IA ? Passez par le parcours avancé ↓',
    platforms: [
      { name: 'macOS', sub: 'Apple Silicon · Intel' },
      { name: 'Windows', sub: 'x64 · Installateur NSIS' },
      { name: 'Linux', sub: 'x86_64 · AppImage' },
    ],
    downloadLabel: 'Télécharger',
    noteBefore: "Le numéro de version et la taille de l'installateur sont récupérés depuis ",
    noteLink: 'la page de téléchargement',
    noteAfter:
      " automatiquement depuis les dernières GitHub Releases. Si votre système bloque le premier lancement, la seconde moitié de la page de téléchargement explique comment l'autoriser.",
  },
  install: {
    badge: 'Parcours avancé · pour ceux qui connaissent les outils IA',
    titleA: 'Vous utilisez déjà Claude Code / Codex ? ',
    titleHighlight: 'ajoutez le skill',
    titleEnd: '.',
    lede: "C'est le parcours avancé, pour ceux qui travaillent déjà dans un agent IA. Les chercheurs d'emploi classiques seront plus à l'aise avec l'app de bureau.",
    noteBefore: 'Pas familier avec les agents IA ? ',
    noteLink: "Téléchargez l'app de bureau",
    noteAfter: ' pour commencer tout de suite — disponible sur macOS / Windows / Linux.',
    cardMeta: 'Multi-agents / 40+ compatibles',
  },
  faq: {
    eyebrow: 'FAQ',
    titleA: 'Vos questions sont ',
    titleHighlight: 'probablement',
    titleEnd: ' ici.',
    articlesEyebrow: 'Articles emploi',
    articlesTitle: 'CV, entretiens et offres : lisez un article quand ça bloque.',
    articlesLede:
      "Une collection des points bloquants fréquents dans la recherche d'emploi : comment retravailler un CV, comment préparer un entretien, comment juger si une opportunité vaut le coup.",
    articlesCta: 'Vers le centre de contenu',
    articlesEmpty:
      'Les articles sont en préparation. En attendant, explorez le centre de contenu pour les rubriques déjà ouvertes.',
  },
  download: {
    eyebrow: 'App de bureau',
    title: 'Télécharger MuiCV',
    lede: "Pas besoin d'installer Claude Code ni de comprendre les skills. Ouvrez l'app, importez un CV ou enregistrez votre première expérience, et Mui vous guide vers une bibliothèque de carrière que vous pourrez enrichir en continu.",
    firstMinuteLabel: 'La première minute après le téléchargement',
    firstMinuteSteps: [
      {
        title: 'Connectez-vous à votre compte muicv',
        desc: "Autorisez dans le navigateur ; l'app revient automatiquement à l'état connecté.",
      },
      {
        title: 'Importez un CV ou partez de zéro',
        desc: 'Importez un CV existant, ou décrivez simplement un projet et une expérience que vous avez vécus.',
      },
      {
        title: "Démarrez votre premier échange d'organisation",
        desc: "Mui découpe d'abord votre matière en éléments réutilisables, puis génère des versions selon le poste.",
      },
    ],
    releasedAt: 'Publié le',
    platforms: [
      { title: 'macOS · Apple Silicon', subtitle: 'M1 / M2 / M3 / M4', key: 'mac-arm64' },
      { title: 'macOS · Intel', subtitle: 'x64 (anciens Mac)', key: 'mac-x64' },
      { title: 'Windows', subtitle: 'x64 · Installateur NSIS', key: 'win' },
      { title: 'Linux', subtitle: 'x86_64 · AppImage', key: 'linux' },
    ],
    unsignedNote:
      "Aucun des builds n'est signé numériquement : le premier lancement demande une autorisation manuelle selon les étapes ci-dessous. Cette étape disparaîtra une fois les certificats développeur en place.",
    noArch: "Cette version ne fournit pas d'artefact pour cette architecture",
    downloadLabel: 'Télécharger',
    noReleaseLead:
      "🐾 Impossible de récupérer une version publiée de l'app de bureau pour le moment. En attendant, vous pouvez :",
    noReleaseSkill:
      "Vous utilisez déjà un agent IA comme Claude Code, Codex ou Cursor ? La commande d'installation du skill est sur la page d'accueil — 5 secondes pour l'intégrer",
    noReleaseContactBefore: 'Une question ou un retour ? ',
    noReleaseContactLink: 'Contactez-nous',
    firstRunTitle: '⚠️ Le premier lancement nécessite une autorisation',
    firstRunLede:
      "Les trois plateformes ne sont pas signées numériquement, le système va vous bloquer. Suivez les étapes une fois pour l'autoriser, puis double-clic / ligne de commande directement.",
    firstRunMacSteps: [
      'Téléchargez le .dmg et glissez-le dans /Applications',
      <>
        <strong>Clic droit</strong> (ou control-clic) sur l'app → <strong>Ouvrir</strong>
      </>,
      "Après l'alerte, cliquez à nouveau sur « Ouvrir » ; ensuite le double-clic fonctionnera",
    ],
    firstRunMacCliLabel: 'Version ligne de commande (sans interface graphique) :',
    firstRunMacCli: 'xattr -d com.apple.quarantine /Applications/Mui简历.app',
    firstRunWinSteps: [
      'Double-cliquez sur le .exe téléchargé',
      <>
        Alerte SmartScreen → cliquez sur <strong>Informations complémentaires</strong> → cliquez sur{' '}
        <strong>Exécuter quand même</strong>
      </>,
      "Choisissez un chemin d'installation ; par défaut dans votre dossier utilisateur, sans mot de passe administrateur",
    ],
    firstRunLinuxLede: "Après avoir téléchargé le .AppImage, accordez-lui les droits d'exécution et lancez-le :",
  },
  meta: {
    home: {
      title: 'MuiCV — Générateur de CV IA | Modèles de CV développeur et création de CV ATS',
      description:
        "MuiCV (muicv.com) est le générateur de CV IA et l'espace de travail tout-en-un pour votre recherche d'emploi : modèles de CV pour développeurs, création de CV en ligne, optimisation intelligente des mots-clés ATS et export PDF A4. Vos données restent locales, pour une confidentialité totale.",
    },
    download: {
      title: "Télécharger l'app de bureau MuiCV (macOS / Windows / Linux)",
      description:
        "Téléchargez l'app de bureau MuiCV pour macOS, Windows et Linux. Importez un CV ou collez une expérience, organisez vos données de carrière en local, puis générez, évaluez et exportez un CV PDF adapté par IA. Téléchargement gratuit, données stockées en local.",
    },
  },
};

export const content: LocaleContent = {
  about: {
    meta: {
      title: 'À propos',
      description:
        'Nous voulons créer un outil qui vous aide vraiment à décrocher une offre — pas un générateur de modèles de CV de plus.',
    },
    heroEyebrow: 'À propos',
    heroTitleLead: 'Un outil qui vous fait vraiment décrocher ',
    heroTitleHighlight: "l'offre",
    heroTitleMid: ',',
    heroTitleTail: 'pas un générateur de modèles de plus.',
    heroLede:
      "MuiCV est une plateforme IA tout-en-un pour la recherche d'emploi : de l'organisation de vos expériences passées à la découverte de postes adaptés, en passant par la personnalisation du CV, les entretiens blancs et les lettres de motivation — tout tourne autour d'un objectif : décrocher votre prochain emploi, pas seulement produire un beau PDF.",
    doEyebrow: 'Ce que nous faisons',
    doTitle: "Le parcours complet, de vos expériences à l'offre.",
    doCards: [
      {
        t: 'Pas seulement un CV',
        d: "Le CV n'est qu'un point d'entrée. Ce qui compte à nos yeux, c'est ce qui décide vraiment de l'obtention d'une offre : le matching de postes, la préparation aux entretiens et la stratégie de recherche.",
      },
      {
        t: 'Vos données vous appartiennent',
        d: 'Toutes vos expériences sont stockées sous forme de fichiers Markdown sur votre ordinateur ou dans votre projet. Pas de « coffre-fort de CV » dans le cloud, vos données ne sont pas verrouillées.',
      },
      {
        t: "Nous n'inventons rien",
        d: "Tout le contenu repose strictement sur les faits que vous écrivez. S'il manque quelque chose, nous posons la question ou laissons vide — jamais de « création » à votre place, pour que votre CV ne vous piège pas en entretien.",
      },
    ],
    whyEyebrow: "Pourquoi nous l'avons créé",
    whyTitle: 'Chercher un emploi ne devrait pas être aussi difficile.',
    whyParagraphs: [
      "Nous avons vu trop de bons candidats couler à cause de leur CV : un parcours solide mais mal expliqué, un modèle après l'autre, une soirée entière à retoucher pour une offre sans savoir si ça vaut le coup de postuler.",
      "La plupart des outils de CV ne résolvent que l'esthétique, alors que la vraie difficulté se situe aux deux extrémités : en amont, « qu'est-ce que j'ai réellement à raconter », et en aval, « quel poste me correspond et comment me préparer à l'entretien ».",
      "Nous voulons un outil qui couvre tout le parcours et soigne chaque étape sans bâcler — de la première expérience que vous écrivez jusqu'au jour où vous décrochez l'offre.",
    ],
    teamEyebrow: 'Équipe',
    teamTitle: 'Un corgi et un ingénieur.',
    teamPara1: (
      <>
        Projet lancé par <strong className="text-ink">meathill</strong> (développeur frontend depuis plusieurs années),
        supervisé par le corgi <strong className="text-ink">Mui</strong> — la petite chienne jaune et blanche de
        meathill, qui supervise en s'allongeant sur le clavier et en influençant les merges.
      </>
    ),
    teamPara2:
      "D'autres partenaires nous rejoindront, mais l'intention initiale ne changera pas : faire des outils, pas des effets marketing ; placer l'expérience utilisateur et la maîtrise des données au premier plan.",
    ctaTitle: 'Votre prochain emploi commence ici.',
    ctaSignedIn: 'Accéder au tableau de bord',
    ctaSignedOut: 'Commencer gratuitement',
    ctaContact: 'Nous contacter',
  },
  contact: {
    meta: {
      title: 'Nous contacter',
      description: 'Retours produits, partenariats, presse — écrivez à la bonne adresse pour une réponse plus rapide.',
    },
    heroEyebrow: 'Contact',
    heroTitleLead: 'Vous voulez nous ',
    heroTitleHighlight: 'dire quelque chose',
    heroTitleTail: ' ?',
    heroLede:
      'Nous lisons chaque e-mail. Nous répondons généralement sous 1 à 3 jours ouvrés ; un peu plus lentement en période de pointe, mais vous aurez toujours une réponse.',
    contacts: [
      {
        label: 'Général',
        tag: 'Retours produit / support',
        email: 'hi@muicv.com',
        desc: "Questions d'utilisation, signalements de bugs, idées de fonctionnalités — tout ce qui concerne le produit lui-même.",
      },
      {
        label: 'Partenariats',
        tag: 'Entreprises / équipes / partenaires',
        email: 'partner@muicv.com',
        desc: "Achats en volume pour équipes, partenariats avec des établissements de formation, intégrations avec des plateformes d'emploi — pour toute demande commerciale, cette adresse répond plus vite.",
      },
      {
        label: 'Presse',
        tag: 'Interview / couverture / marque',
        email: 'press@muicv.com',
        desc: "Demandes d'interview, éléments médias, ressources de marque. Un mot sur votre angle et nous revenons vers vous rapidement.",
      },
    ],
    noteStrong: "Envie d'essayer tout de suite ?",
    noteLink: "Télécharger l'app de bureau",
    noteAfter: 'pour commencer maintenant — disponible sur macOS / Windows / Linux.',
  },
  pricing: {
    meta: {
      title: 'Tarifs',
      description:
        "Facturation au token, sans expiration. 10,000 tokens offerts à l'inscription ; abonnement mensuel, annuel ou packs de recharge au choix.",
    },
    heroEyebrow: 'Tarifs',
    heroTitleLead: 'Facturé au ',
    heroTitleHighlight: 'token',
    heroTitleMid: ', ',
    heroTitleTail: 'sans expiration.',
    heroLede:
      "10,000 tokens offerts à l'inscription (une seule fois). Quand vous en manquez, choisissez un abonnement mensuel ou annuel, ou achetez un pack de recharge à tout moment. Les Skills sont toujours gratuits, BYOK toujours disponible.",
    toggleMonthly: 'Mensuel',
    toggleYearly: 'Annuel',
    toggleSavings: 'économisez ≈17%',
    free: {
      title: 'Commencer gratuitement',
      sub: "Envie d'essayer ? Commencez ici.",
      grantNote: "Offert à l'inscription · une seule fois",
      bullets: [
        'Tous les services cloud (LLM / PDF / JD) accessibles',
        'Gestion illimitée des expériences locales',
        'Branchez BYOK pour un usage « illimité » du LLM',
        "Rechargez ou abonnez-vous quand le solde s'épuise — sans expiration",
      ],
      ctaSignedIn: 'Accéder au tableau de bord',
      ctaSignedOut: 'Créer un compte et recevoir 10K tokens gratuits',
    },
    tokenLineYearly: "Toute une année d'avance :",
    tokenLineMonthly: 'Rechargé chaque mois :',
    tiers: {
      pro: {
        tagline: "Pour une recherche d'emploi sérieuse.",
        badge: 'Le plus populaire',
        features: [
          "Toutes les fonctionnalités (LLM / PDF / JD / bibliothèque d'offres) allouées librement par token",
          "Résiliez quand vous voulez — les tokens accordés n'expirent jamais",
          'Support e-mail prioritaire',
        ],
      },
      max: {
        tagline: 'Pour une recherche intensive.',
        features: ['Tout le contenu de Pro', 'Accès anticipé aux nouveaux modules', 'Canal de support dédié'],
      },
    },
    cardPerYear: 'Par an',
    cardPerMonth: 'Par mois',
    signUpToSubscribe: "Inscription requise pour s'abonner",
    manageSub: "Gérer l'abonnement",
    subscribeNow: "S'abonner",
    cnBuyPrefix: 'Acheter ',
    cnPackNote: (days) =>
      `Paiement unique (Chine) · un achat par utilisateur et par cycle de ${days} jours · tokens sans expiration`,
    topupHeading: 'Packs de recharge (achat unique, sans expiration)',
    topupDesc: 'Pas prêt à vous abonner, ou un dépassement occasionnel ? Achetez quand vous voulez.',
    buyNow: 'Acheter maintenant',
    signUpToBuy: 'Inscription requise pour acheter',
    faqEyebrow: 'À propos des tarifs',
    faqTitle: "Quelques détails qu'on nous demande souvent.",
    faq: [
      {
        q: 'Comment MuiCV facture-t-il ?',
        a: "Les appels LLM sont enregistrés selon les tokens prompt + completion de l'amont, puis convertis à notre tarif (les portions mises en cache sont aussi facturées au tarif amont) ; le rendu PDF coûte 200 tokens à chaque fois ; l'extraction d'offre coûte 300 tokens à chaque fois. Chaque appel apparaît en détail dans le journal de votre console.",
      },
      {
        q: 'Quelle différence entre mensuel et annuel ?',
        a: "L'annuel est environ 17% moins cher et accorde toute l'année de tokens d'un coup — utilisable dès le premier jour. En cas de résiliation, tous les tokens accordés sont conservés et n'expirent jamais. Le mensuel convient pour essayer, l'annuel pour s'engager dans la durée.",
      },
      {
        q: 'Peut-on utiliser un abonnement et des packs de recharge en même temps ?',
        a: "Oui. L'abonnement se recharge automatiquement à chaque période ; les packs de recharge s'ajoutent à la main quand le solde baisse. Les tokens des deux arrivent sur le même solde, sans ordre d'utilisation particulier.",
      },
      {
        q: 'Peut-on changer de formule ou résilier à tout moment ?',
        a: "Oui. « Gérer l'abonnement » dans la console ouvre le Stripe Customer Portal — vous y résiliez, changez de formule ou de moyen de paiement. Les tokens accordés n'expirent jamais ; après résiliation, vous continuez d'utiliser votre ancien solde. La facturation suit l'usage réel, jamais de double facturation.",
      },
      {
        q: 'Les utilisateurs gratuits reçoivent-ils des tokens chaque mois ?',
        a: "Non. L'inscription accorde 10,000 tokens une seule fois, c'est tout. Une fois épuisés, achetez un pack de recharge (le moins cher : ¥10 = 10K tokens), prenez un abonnement mensuel / annuel, ou utilisez BYOK pour que le LLM tourne sur votre propre API (PDF / JD restent facturés en tokens muicv).",
      },
      {
        q: 'Remboursement possible si je ne suis pas satisfait ?',
        a: "Les abonnements sont remboursables intégralement sous 7 jours si les fonctionnalités principales n'ont pas été utilisées — écrivez-nous. Les packs de recharge sont crédités immédiatement et ne sont généralement pas remboursables ; en cas d'achat accidentel ou de problème majeur, écrivez-nous et nous trouverons une solution.",
      },
      {
        q: "J'ai acheté une API ailleurs — dois-je quand même payer ?",
        a: "Vous pouvez choisir BYOK uniquement : renseignez votre URL d'API et votre clé dans la console, et tous les appels LLM passent sur votre propre solde, sans consommer de tokens muicv. Mais les services à valeur ajoutée comme le rendu PDF ou l'extraction d'offre restent facturés en tokens muicv (nous sommes les seuls à les fournir).",
      },
      {
        q: 'Je ne sais pas où acheter une API — une recommandation ?',
        a: "J'ai aussi développé muirouter — uniquement de l'IA d'origine, compatible avec tous les grands produits. Si vous utilisez de l'IA à plusieurs endroits et voulez mieux exploiter votre budget IA, essayez : https://muirouter.com.",
      },
      {
        q: 'Quels sont les avantages de BYOK ?',
        a: "Si aucune de nos formules ne vous convient — trop peu ou trop — ou si vous utilisez plusieurs produits d'IA, envisagez BYOK. Le quota que vous n'utilisez pas ici pourra servir à vos autres produits d'IA.",
      },
      {
        q: 'Le kit de Skills est-il payant ?',
        a: "Non. npx skills add dans n'importe quel agent IA (Claude Code / Codex / Cursor, etc.) est entièrement gratuit — la facturation de la plateforme ne concerne que les capacités côté serveur (export PDF / recherche de postes).",
      },
    ],
  },
  faq: [
    {
      q: 'Où sont stockées mes données de CV ? Qui peut les voir ?',
      a: (
        <>
          Tout reste sur votre ordinateur — sous forme de fichiers Markdown, entièrement sous votre contrôle. Libre à
          vous de les sauvegarder ou de les partager. Nos serveurs ne touchent vos données que brièvement, lorsque vous
          lancez vous-même des fonctions comme l'export PDF ou l'extraction d'offre, puis les effacent — nous ne
          conservons aucun contenu de CV.
        </>
      ),
      text: "Tout reste sur votre ordinateur, sous forme de fichiers Markdown, entièrement sous votre contrôle. Libre à vous de les sauvegarder ou de les partager. Nos serveurs ne touchent vos données que brièvement, lorsque vous lancez vous-même des fonctions comme l'export PDF ou l'extraction d'offre, puis les effacent — nous ne conservons aucun contenu de CV.",
    },
    {
      q: 'Combien ça coûte ?',
      a: (
        <>
          Un seul portefeuille de tokens :
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>10,000 tokens offerts une fois à l'inscription</strong>, sans expiration, jusqu'à épuisement
            </li>
            <li>
              <strong>Abonnement</strong> : Pro / Max mensuel ou annuel, tokens rechargés automatiquement à chaque
              période ; l'annuel accorde toute l'année d'un coup, environ 17% de réduction
            </li>
            <li>
              <strong>Packs de recharge</strong> : achetez 10K / 35K / 130K tokens en une fois, quand vous voulez
            </li>
            <li>
              <strong>BYOK</strong> : renseignez votre URL d'API et votre clé dans la console pour que le LLM utilise
              votre solde ; PDF / JD restent facturés en tokens muicv
            </li>
          </ul>
          Les services cloud (export PDF, recherche de postes, etc.) sont facturés au token. Voir la{' '}
          <a href="/pricing" className={faqLink}>
            page des tarifs
          </a>{' '}
          pour le détail.
        </>
      ),
      text: "Un seul portefeuille de tokens : 10,000 tokens offerts une fois à l'inscription, sans expiration ; abonnement Pro / Max mensuel ou annuel avec recharge automatique des tokens chaque période, environ 17% de réduction en annuel ; packs de recharge de 10K / 35K / 130K tokens en une fois ; BYOK permet de brancher votre propre clé d'API pour que le LLM utilise votre solde. Les services cloud (export PDF, recherche de postes, etc.) sont facturés au token, voir la page des tarifs pour le détail.",
    },
    {
      q: "Qu'est-ce que le BYOK ?",
      a: (
        <>
          BYOK = Bring Your Own Key, autrement dit votre propre solde LLM. Une fois lié, tous les appels IA passent sur
          votre solde et nous ne consommons plus de tokens de la plateforme — idéal si vous avez déjà un abonnement LLM
          et voulez unifier la gestion des coûts.
        </>
      ),
      text: 'BYOK = Bring Your Own Key, autrement dit votre propre solde LLM. Une fois lié, tous les appels IA passent sur votre solde et nous ne consommons plus de tokens de la plateforme — idéal si vous avez déjà un abonnement LLM et voulez unifier la gestion des coûts.',
    },
    {
      q: "Quand sort l'app de bureau ?",
      a: (
        <>
          <strong>Elle est déjà disponible</strong>, sur macOS / Windows / Linux. Rendez-vous sur la{' '}
          <a href="/download" className={faqLink}>
            page de téléchargement
          </a>{' '}
          pour la dernière version. Si vous utilisez déjà un agent IA (Claude Code / Codex / Cursor, etc.), vous pouvez
          aussi passer par le kit de Skills — les deux voies fonctionnent.
        </>
      ),
      text: 'Elle est déjà disponible, sur macOS / Windows / Linux — rendez-vous sur la page de téléchargement pour la dernière version. Si vous utilisez déjà un agent IA (Claude Code / Codex / Cursor, etc.), vous pouvez aussi passer par le kit de Skills. Les deux voies fonctionnent.',
    },
    {
      q: 'Les CV en anglais / bilingues sont-ils pris en charge ?',
      a: (
        <>
          Oui. La langue de vos expériences détermine celle du CV ; pour un poste en anglais, le CV généré suit les
          codes anglophones. Des modèles bilingues côte à côte sont en préparation.
        </>
      ),
      text: 'Oui. La langue de vos expériences détermine celle du CV ; pour un poste en anglais, le CV généré suit les codes anglophones. Des modèles bilingues côte à côte sont en préparation.',
    },
    {
      q: 'Cela postule-t-il automatiquement sur LinkedIn / Boss 直聘 ?',
      a: (
        <>
          Non. Nous vous aidons seulement à extraire des offres, générer des CV ciblés, écrire des lettres de motivation
          et organiser une checklist — c'est vous qui appuyez sur « postuler ». C'est volontaire, pour éviter les
          risques de compte et les violations de CGU.
        </>
      ),
      text: "Non. Nous vous aidons seulement à extraire des offres, générer des CV ciblés, écrire des lettres de motivation et organiser une checklist — c'est vous qui appuyez sur « postuler ». C'est volontaire, pour éviter les risques de compte et les violations de CGU.",
    },
    {
      q: "À qui s'adresse MuiCV ?",
      a: (
        <>
          Aux personnes en recherche d'emploi qui retravaillent souvent leur CV — jeunes diplômés, personnes en
          reconversion, changements de poste, ou candidats qui postulent à de nombreuses offres en même temps. Si vous
          utilisez déjà un agent IA comme Claude Code ou Cursor, branchez le skill ; si vous préférez éviter la ligne de
          commande, téléchargez l'app de bureau. Vous apportez votre expérience, Mui la transforme en un CV aligné sur
          le poste.
        </>
      ),
      text: "Aux personnes en recherche d'emploi qui retravaillent souvent leur CV — jeunes diplômés, personnes en reconversion, changements de poste, ou candidats qui postulent à de nombreuses offres en même temps. Si vous utilisez déjà un agent IA comme Claude Code ou Cursor, branchez le skill ; si vous préférez éviter la ligne de commande, téléchargez l'app de bureau. Vous apportez votre expérience, Mui la transforme en un CV aligné sur le poste.",
    },
    {
      q: "L'IA optimise-t-elle / modifie-t-elle mon CV ?",
      a: (
        <>
          Oui, mais uniquement à partir des faits que vous fournissez. Mui évalue votre brouillon selon STAR, les
          résultats chiffrés, les mots-clés du poste et la longueur : elle signale les phrases trop vagues, les passages
          sans données, les mots-clés manquants, et propose des réécritures directement utilisables. Collez la
          description du poste cible et elle resélectionne et réécrit vos expériences pour ce poste. Elle n'invente
          jamais rien.
        </>
      ),
      text: "Oui, mais uniquement à partir des faits que vous fournissez. Mui évalue votre brouillon selon STAR, les résultats chiffrés, les mots-clés du poste et la longueur : elle signale les phrases trop vagues, les passages sans données, les mots-clés manquants, et propose des réécritures directement utilisables. Collez la description du poste cible et elle resélectionne et réécrit vos expériences pour ce poste. Elle n'invente jamais rien.",
    },
    {
      q: 'Quel est le site officiel de MuiCV ?',
      a: (
        <>
          Un seul : <strong>muicv.com</strong> — www.muicv.com redirige ici. Il existe des outils de CV aux noms
          proches, sans aucun lien avec nous ; enregistrez muicv.com et vous ne vous tromperez jamais.
        </>
      ),
      text: 'Un seul : muicv.com — www.muicv.com redirige ici. Il existe des outils de CV aux noms proches, sans aucun lien avec nous ; enregistrez muicv.com et vous ne vous tromperez jamais.',
    },
  ],
};
