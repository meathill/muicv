import type { LocaleContent } from './locale-content';
import type { Dictionary } from './types';

// Deutsch. Native Marketing-Texte, keine wörtliche Übersetzung.
// FAQ-Akkordeon (JSX) und Seiteninhalte liegen in `content`, siehe locale-content.ts.

export const dict: Dictionary = {
  brand: { name: 'MuiCV', by: 'by Mui 🐾' },
  nav: {
    links: [
      { label: 'Vorlagen', href: '/templates' },
      { label: 'Artikel', href: '/posts/jobs' },
      { label: 'Skills', href: '/skills' },
      { label: 'Preise', href: '/pricing' },
      { label: 'Download', href: '/download' },
    ],
    console: 'Konsole öffnen',
    signIn: 'Anmelden',
    signUp: 'Registrieren',
  },
  footer: {
    tagline:
      'Die All-in-One-KI-Plattform für die Jobsuche. Lebenslauf, Stellensuche, Probeinterviews und Karriere-Coaching — damit du ein besseres Jobangebot bekommst.',
    curatedBy: 'Betreut vom Corgi Mui',
    cols: [
      {
        label: 'Produkt',
        links: [
          { label: 'Funktionen', href: '/#features' },
          { label: 'Lebenslauf-Vorlagen', href: '/templates' },
          { label: 'Preise', href: '/pricing' },
          { label: 'Desktop-App', href: '/download' },
          { label: 'Skill-Katalog', href: '/skills' },
          { label: 'Konsole', href: '/dashboard' },
        ],
      },

      {
        label: 'Inhalte',
        links: [
          { label: 'Job-Artikel', href: '/posts/jobs' },
          { label: 'Alle Artikel', href: '/posts' },
          { label: 'Changelog', href: '/changelog' },
        ],
      },
      {
        label: 'Unternehmen',
        links: [
          { label: 'Über uns', href: '/about' },
          { label: 'Kontakt', href: '/contact' },
        ],
      },
      {
        label: 'Rechtliches',
        links: [
          { label: 'Nutzungsbedingungen', href: '/terms' },
          { label: 'Datenschutz', href: '/privacy' },
        ],
      },
    ],
    copyright: '© 2026 Meathill LLC · MuiCV · Alle Rechte vorbehalten',
    madeIn: 'Mit 🐾 in China gemacht',
  },
  hero: {
    badge: 'Desktop-App ist live — starte mit einem einzigen Baustein',
    titleA: 'Gib Lebenslauf und Erfahrung ',
    titleHighlight: 'an Mui zum Sortieren',
    titleEnd: '.',
    lede: 'Lade die Desktop-App herunter und importiere deinen bestehenden Lebenslauf oder füge eine Station ein. Mui strukturiert das zuerst zu einer wiederverwendbaren Materialsammlung für deine Karriere und erstellt, prüft und exportiert dann für jede Stelle einen passenden Lebenslauf.',
    ctaDownload: 'Desktop-App herunterladen',
    ctaSteps: 'Die 3 Schritte ansehen',
    accountSignedIn: 'Zum Dashboard',
    accountSignedOut: 'Konto erstellen',
    agentNote:
      'Du kennst dich schon mit Claude Code, Codex oder Cursor aus? Weiter unten auf der Seite findest du die Skill-Installation — bleib einfach bei deiner gewohnten Toolchain.',
  },
  heroShowcase: {
    tabsAria: 'Demo wechseln',
    slides: { import: 'Importieren', library: 'Bibliothek', resume: 'Anpassen' },
    caption: 'Erst ordnen, dann pro Stelle verfeinern',
    importHeader: 'MuiCV · Schritt 1',
    importTitle: 'Leg zuerst etwas Echtes rein',
    importDesc:
      'Lade einen Lebenslauf hoch, füge eine Station ein oder sag einfach „Ich möchte bei null anfangen.“ Mui startet mit dem, was du schon hast.',
    importItems: [
      { title: 'Lebenslauf.pdf', desc: 'Wird in editierbares Material umgewandelt' },
      { title: 'Eine Projektgeschichte', desc: 'Kontext, Handlung, Ergebnis ergänzen' },
      { title: 'Link zur Zielstelle', desc: 'Später für die Versionengenerierung genutzt' },
    ],
    libraryHeader: 'Karriere-Bibliothek',
    libraryNavLabel: 'Navigation',
    libraryNav: ['Erfahrung', 'Projekte', 'Skills', 'Stellen'],
    libraryListLabel: 'Wiederverwendbares Material',
    libraryItems: [
      { title: 'Wachstumsplattform für Mitglieder geleitet', match: 'Quantifiziert' },
      { title: 'Frontend-Release-Pipeline neu aufgebaut', match: 'Bereit' },
      { title: 'Teamübergreifende Tracking-Standards vorangetrieben', match: 'Offen' },
    ],
  },
  features: {
    eyebrow: 'Was es kann',
    titleA: 'Erst das Material ordnen,',
    titleHighlight: 'dann anpassen',
    titleEnd: '.',
    lede: 'Bei Mui geht es nicht darum, dir eine Geschichte zu erfinden, sondern echte Erfahrung in wiederverwendbares Material zu verwandeln und die Formulierung dann pro Stelle anzupassen.',
    statusLive: 'Live',
    statusSoon: 'Demnächst',
    items: [
      {
        id: 'organize',
        title: 'Karrierematerial ordnen',
        desc: 'Zerlege deinen bestehenden Lebenslauf, Projekte, Skills und Highlights in wiederverwendbares Material. Jede Bewerbung startet vom selben Fundament.',
        status: 'live',
        highlights: ['Lebenslauf importieren', 'Lücken füllen', 'Lokale Dateien'],
      },
      {
        id: 'generate',
        title: 'Pro Stelle generieren',
        desc: 'Gib Mui eine Zielstelle, und es wählt, sortiert und schreibt aus deiner Bibliothek eine Lebenslauf-Version, die besser passt.',
        status: 'live',
        highlights: ['Stellen-Scraping', 'Match-Bewertung', 'Versionierung'],
      },
      {
        id: 'review',
        title: 'Prüfen und exportieren',
        desc: 'Prüfe Entwürfe nach STAR, Kennzahlen, Keywords und Länge und exportiere dann ein A4-PDF — weniger Hektik kurz vor der Bewerbung.',
        status: 'live',
        highlights: ['7-Punkte-Prüfung', 'Verbesserungsvorschläge', 'PDF-Export'],
      },
      {
        id: 'practice',
        title: 'Jobsuche weiter üben',
        desc: 'Wenn das Material steht, geht es weiter mit Probeinterviews, Anschreiben und einer Bewerbungs-Checkliste. Erweiterte Funktionen kommen, wenn du sie brauchst.',
        status: 'soon',
        highlights: ['Probeinterview', 'Anschreiben', 'Bewerbungs-Checkliste'],
      },
    ],
  },
  workflow: {
    eyebrow: 'So startest du',
    titleA: 'Beim ersten Start',
    titleHighlight: 'nur drei Dinge',
    titleEnd: '.',
    aside:
      'Schließe zuerst dein erstes Karrierematerial ab — du musst nicht sofort jede Funktion verstehen. Lebenslauf-Versionen, Stellen-Matching und Export wachsen von hier aus.',
    steps: [
      {
        title: 'Lebenslauf importieren oder Station einfügen',
        desc: 'Keine Konzepte zum Einlernen nötig. Leg ein PDF, ein Dokument oder eine Projektgeschichte rein, die du schon hast — Mui startet mit echtem Material.',
      },
      {
        title: 'In eine wiederverwendbare Bibliothek ordnen',
        desc: 'Erfahrung, Projekte und Skills werden zu Markdown-Dateien auf deinem eigenen Rechner. Kein Neuanfang bei jeder Bearbeitung.',
      },
      {
        title: 'Pro Stelle generieren, prüfen und exportieren',
        desc: 'Mit einer fertigen Bibliothek fügst du einen Stellen-Link oder -Text ein; Mui generiert eine Version, prüft auf Probleme und exportiert ein fertiges PDF.',
      },
    ],
  },
  desktopApp: {
    badge: 'Desktop-App · Live',
    titleA: 'Neu bei KI-Agenten?',
    titleHighlight: 'Einfach herunterladen',
    titleEnd: '.',
    lede: 'Eine plattformübergreifende Desktop-App. Sie führt dich zuerst durch den Import eines Lebenslaufs oder das Erfassen deiner ersten Station und danach weiter zu Stellen-Matching, Lebenslauf-Prüfung und PDF-Export.',
    ctaDownload: 'Desktop-App herunterladen',
    ctaAdvanced: 'Nutzt du schon einen KI-Agenten? Fortgeschrittenen-Pfad ↓',
    platforms: [
      { name: 'macOS', sub: 'Apple Silicon · Intel' },
      { name: 'Windows', sub: 'x64 · NSIS-Installer' },
      { name: 'Linux', sub: 'x86_64 · AppImage' },
    ],
    downloadLabel: 'Herunterladen',
    noteBefore: 'Versionsnummer und Installationsgröße werden von ',
    noteLink: 'der Download-Seite',
    noteAfter:
      ' automatisch aus den neuesten GitHub Releases geladen. Falls dein System den ersten Start blockiert, erklärt die untere Hälfte der Download-Seite, wie du es zulässt.',
  },
  install: {
    badge: 'Fortgeschrittenen-Pfad · für KI-Tool-Profis',
    titleA: 'Schon mit Claude Code / Codex unterwegs?',
    titleHighlight: 'Einfach das Skill installieren',
    titleEnd: '.',
    lede: 'Das ist der fortgeschrittene Weg für alle, die bereits in einem KI-Agenten arbeiten. Normale Jobsuchende kommen mit der Desktop-App leichter voran.',
    noteBefore: 'Neu bei KI-Agenten? ',
    noteLink: 'Desktop-App herunterladen',
    noteAfter: ' und direkt loslegen — verfügbar für macOS / Windows / Linux.',
    cardMeta: 'Agent-übergreifend / 40+ kompatibel',
  },
  faq: {
    eyebrow: 'Häufige Fragen',
    titleA: 'Was du dich fragst,',
    titleHighlight: 'steht wahrscheinlich',
    titleEnd: ' hier.',
    articlesEyebrow: 'Job-Artikel',
    articlesTitle: 'Lebenslauf, Interview und Jobangebot — lies einen Artikel, wenn du feststeckst.',
    articlesLede:
      'Eine wachsende Sammlung typischer Hürden bei der Jobsuche: Wie überarbeite ich meinen Lebenslauf, wie bereite ich mich aufs Interview vor, woran erkenne ich, ob sich eine Chance lohnt.',
    articlesCta: 'Zum Content-Hub',
    articlesEmpty: 'Die Artikel sind noch in Arbeit. Schau im Content-Hub nach den bereits offenen Rubriken.',
  },
  download: {
    eyebrow: 'Desktop-App',
    title: 'MuiCV herunterladen',
    lede: 'Du musst weder Claude Code installieren noch dich zuerst mit Skills auskennen. Öffne die App, importiere einen Lebenslauf oder erfasse deine erste Station — Mui führt dich zu einer Materialsammlung, die du immer weiter ausbauen kannst.',
    firstMinuteLabel: 'Deine erste Minute nach dem Download',
    firstMinuteSteps: [
      {
        title: 'Bei deinem muicv-Konto anmelden',
        desc: 'Schließe die Autorisierung im Browser ab; die App kehrt automatisch in den angemeldeten Zustand zurück.',
      },
      {
        title: 'Lebenslauf importieren oder neu starten',
        desc: 'Lade einen bestehenden Lebenslauf hoch oder beschreib einfach ein Projekt und eine Erfahrung.',
      },
      {
        title: 'Ersten Sortier-Chat starten',
        desc: 'Mui zerlegt dein Material zuerst in wiederverwendbare Bausteine und generiert danach Versionen pro Stelle.',
      },
    ],
    releasedAt: 'Veröffentlicht',
    platforms: [
      { title: 'macOS · Apple Silicon', subtitle: 'M1 / M2 / M3 / M4', key: 'mac-arm64' },
      { title: 'macOS · Intel', subtitle: 'x64 (ältere Modelle)', key: 'mac-x64' },
      { title: 'Windows', subtitle: 'x64 · NSIS-Installer', key: 'win' },
      { title: 'Linux', subtitle: 'x86_64 · AppImage', key: 'linux' },
    ],
    unsignedNote:
      'Kein Build ist bisher code-signiert, daher muss der erste Start laut den Schritten unten manuell freigegeben werden; dieser Schritt entfällt, sobald Entwicklerzertifikate vorliegen.',
    noArch: 'Für diese Architektur gibt es in dieser Version kein Artefakt',
    downloadLabel: 'Herunterladen',
    noReleaseLead: '🐾 Die Desktop-App kann gerade keine Release-Version abrufen. Bis dahin kannst du:',
    noReleaseSkill:
      'Wenn du schon mit einem KI-Agenten wie Claude Code, Codex oder Cursor arbeitest, findest du auf der Startseite den Skill-Installationsbefehl — in 5 Sekunden eingebunden',
    noReleaseContactBefore: 'Fragen oder Feedback? ',
    noReleaseContactLink: 'Kontakt aufnehmen',
    firstRunTitle: '⚠️ Beim ersten Öffnen muss die Sperre aufgehoben werden',
    firstRunLede:
      'Keine der drei Plattformen ist code-signiert, daher blockiert das Betriebssystem. Gib es einmal laut den Schritten unten frei, danach funktioniert Doppelklick / Kommandozeile direkt.',
    firstRunMacSteps: [
      'Das .dmg herunterladen und nach /Applications ziehen',
      <>
        <strong>Rechtsklick</strong> (oder control-click) auf die App → <strong>Öffnen</strong>
      </>,
      'Im Dialog erneut „Öffnen“ klicken, danach genügt ein Doppelklick',
    ],
    firstRunMacCliLabel: 'Kommandozeilen-Version (ohne GUI):',
    firstRunMacCli: 'xattr -d com.apple.quarantine /Applications/Mui简历.app',
    firstRunWinSteps: [
      'Die heruntergeladene .exe doppelklicken',
      <>
        Trifft auf die SmartScreen-Warnung → <strong>Weitere Informationen</strong> →{' '}
        <strong>Trotzdem ausführen</strong>
      </>,
      'Installationspfad wählen; standardmäßig im Benutzerverzeichnis, kein Admin-Passwort nötig',
    ],
    firstRunLinuxLede: 'Nach dem Download der .AppImage Ausführungsrechte vergeben und direkt starten:',
  },
  meta: {
    home: {
      title: 'MuiCV — KI-Lebenslauf-Generator | Entwickler-Lebenslaufvorlagen, englische Lebensläufe online erstellen',
      description:
        'Die offizielle MuiCV-Website (muicv.com) ist eine All-in-One-KI-Plattform zum Erstellen von Lebensläufen und für die Jobsuche: Entwickler-Lebenslaufvorlagen, englische Lebensläufe online erstellen, intelligente ATS-Keyword-Optimierung und A4-PDF-Export. Dein Material bleibt lokal unter deiner Kontrolle — sicher und privat.',
    },
    download: {
      title: 'MuiCV Desktop-App herunterladen (macOS / Windows / Linux)',
      description:
        'Lade die MuiCV Desktop-App für macOS, Windows und Linux herunter. Importiere einen Lebenslauf oder füge Erfahrung ein, ordne dein Karrierematerial lokal und generiere, prüfe und exportiere dann mit KI einen PDF-Lebenslauf. Kostenloser Download, Daten bleiben lokal.',
    },
  },
};

const faqLink =
  'font-semibold text-yellow-deep underline decoration-corgi decoration-2 underline-offset-4 hover:decoration-yellow';

export const content: LocaleContent = {
  about: {
    meta: {
      title: 'Über uns',
      description:
        'Wir wollen ein Tool bauen, das dir wirklich zu einem Jobangebot verhilft — nicht noch einen Lebenslauf-Vorlagen-Generator.',
    },
    heroEyebrow: 'Über uns',
    heroTitleLead: 'Ein Tool, das dir wirklich zum ',
    heroTitleHighlight: 'Jobangebot',
    heroTitleMid: ' verhilft, ',
    heroTitleTail: 'nicht noch ein Vorlagen-Generator.',
    heroLede:
      'MuiCV ist eine All-in-One-KI-Plattform für die Jobsuche: vom Ordnen vergangener Erfahrungen über das Finden passender Stellen, das Anpassen von Lebensläufen und Probeinterviews bis zu Anschreiben — alles dreht sich darum, deinen nächsten Job zu bekommen, nicht nur um eine hübsche PDF.',
    doEyebrow: 'Was wir machen',
    doTitle: 'Der komplette Weg vom Material zum Jobangebot.',
    doCards: [
      {
        t: 'Nicht nur Lebensläufe',
        d: 'Der Lebenslauf ist nur der Einstieg. Uns interessiert, was wirklich über das Angebot entscheidet: Stellen-Matching, Interviewvorbereitung und Jobsuchstrategie.',
      },
      {
        t: 'Deine Daten, deine Kontrolle',
        d: 'Alle Materialien liegen als Markdown-Dateien auf deinem eigenen Rechner oder in deinem Projekt. Kein Cloud-„Lebenslauf-Tresor“, der deine Daten einsperrt.',
      },
      {
        t: 'Wir erfinden nichts',
        d: 'Alle Inhalte basieren strikt auf den Fakten, die du schreibst. Fehlt Material, fragen wir nach oder lassen es leer — wir „dichten“ niemals für dich, damit dein Lebenslauf dich im Interview nicht reinlegt.',
      },
    ],
    whyEyebrow: 'Warum wir das bauen',
    whyTitle: 'Jobsuche sollte nicht so schwer sein.',
    whyParagraphs: [
      'Wir haben zu viele starke Kandidaten am Lebenslauf scheitern sehen: Die Arbeit ist großartig, aber die Darstellung unklar; eine Vorlage nach der anderen; eine ganze Nacht an einer Stellenanzeige gefeilt und trotzdem unsicher, ob man sich bewerben soll.',
      'Die meisten Lebenslauf-Tools lösen nur „sieht ordentlich aus“, doch die eigentliche Schwierigkeit liegt an beiden Enden: vorne „was habe ich überhaupt zu erzählen“ und hinten „welche Stelle passt zu mir und worauf muss ich mich im Interview vorbereiten“.',
      'Wir wollen ein Werkzeug für die gesamte Strecke bauen, das jeden Schritt ehrlich macht — von der ersten Station, die du aufschreibst, bis zu dem Tag, an dem du das Angebot bekommst.',
    ],
    teamEyebrow: 'Team',
    teamTitle: 'Ein Corgi, ein Entwickler.',
    teamPara1: (
      <>
        Gestartet von <strong className="text-ink">meathill</strong> (einem Entwickler mit vielen Jahren
        Frontend-Erfahrung), betreut vom Corgi <strong className="text-ink">Mui</strong> — meathills gelb-weißem Hund,
        der beim Kuratieren auf der Tastatur liegt und dadurch Merges beeinflusst.
      </>
    ),
    teamPara2:
      'Künftig werden weitere Mitstreiter dazukommen, aber die ursprüngliche Idee bleibt: Werkzeuge bauen statt Marketing-Tricks; Nutzererlebnis und Datenhoheit an erster Stelle.',
    ctaTitle: "Finde deinen nächsten Job — hier geht's los.",
    ctaSignedIn: 'Zum Dashboard',
    ctaSignedOut: 'Kostenlos starten',
    ctaContact: 'Kontakt aufnehmen',
  },
  contact: {
    meta: {
      title: 'Kontakt',
      description:
        'Produktfeedback, Partnerschaften, Presseanfragen — schreib ans richtige Postfach und bekomme schneller eine Antwort.',
    },
    heroEyebrow: 'Kontakt',
    heroTitleLead: 'Möchtest du uns ',
    heroTitleHighlight: 'etwas sagen',
    heroTitleTail: '?',
    heroLede:
      'Wir lesen jede E-Mail. In der Regel antworten wir innerhalb von 1–3 Werktagen; zu Stoßzeiten etwas langsamer, aber du hörst immer von uns.',
    contacts: [
      {
        label: 'Allgemein',
        tag: 'Produktfeedback / Support',
        email: 'hi@muicv.com',
        desc: 'Nutzungsfragen, Bug-Reports, Funktionsideen — alles rund um das Produkt selbst gehört hierher.',
      },
      {
        label: 'Partnerschaften',
        tag: 'Unternehmen / Teams / Kooperationen',
        email: 'partner@muicv.com',
        desc: 'Team-Lizenzen, Bildungspartnerschaften, Anbindung an Jobplattformen — geschäftliche Anfragen laufen über dieses Postfach und werden schneller beantwortet.',
      },
      {
        label: 'Presse',
        tag: 'Interview / Berichterstattung / Marke',
        email: 'press@muicv.com',
        desc: 'Interviewanfragen, Medienmaterial, Markenunterlagen. Beschreib kurz deine Ausrichtung, wir melden uns zeitnah.',
      },
    ],
    noteStrong: 'Möchtest du es direkt ausprobieren?',
    noteLink: 'Lade die Desktop-App herunter',
    noteAfter: ' und starte direkt — verfügbar für macOS / Windows / Linux.',
  },
  pricing: {
    meta: {
      title: 'Preise',
      description:
        'Abrechnung nach Token, verfallen nie. Bei der Registrierung gibt es 10K Tokens gratis; monatlich, jährlich oder einmalige Top-up-Pakete, ganz wie du willst.',
    },
    heroEyebrow: 'Preise',
    heroTitleLead: 'Abrechnung nach ',
    heroTitleHighlight: 'Token',
    heroTitleMid: ', ',
    heroTitleTail: 'verfallen nie.',
    heroLede:
      'Bei der Registrierung gibt es einmalig 10.000 Tokens gratis. Reicht es nicht, wähle ein Monats- oder Jahresabo oder kaufe jederzeit ein Top-up-Paket. Skills sind immer kostenlos, BYOK immer verfügbar.',
    toggleMonthly: 'Monatlich',
    toggleYearly: 'Jährlich',
    toggleSavings: '≈17 % sparen',
    free: {
      title: 'Kostenlos starten',
      sub: 'Du willst es ausprobieren? Dann fang hier an.',
      grantNote: 'Bei Registrierung · einmalig',
      bullets: [
        'Alle Cloud-Dienste (LLM / PDF / JD) nutzbar',
        'Unbegrenztes lokales Materialmanagement',
        'BYOK anbinden für „unbegrenztes“ LLM',
        'Wenn es aufgebraucht ist, Top-up kaufen oder abonnieren — Guthaben verfällt nie',
      ],
      ctaSignedIn: 'Zum Dashboard',
      ctaSignedOut: 'Kostenlos registrieren und 10K Tokens sichern',
    },
    tokenLineYearly: 'Ganzes Jahr im Voraus:',
    tokenLineMonthly: 'Monatlich automatisch:',
    tiers: {
      pro: {
        tagline: 'Für die ernsthafte Jobsuche.',
        badge: 'Am beliebtesten',
        features: [
          'Alle Funktionen (LLM / PDF / JD / Stellenbibliothek) frei per Token aufteilbar',
          'Abo jederzeit kündbar — gewährte Tokens verfallen nie',
          'Bevorzugter E-Mail-Support',
        ],
      },
      max: {
        tagline: 'Für die intensive Jobsuche.',
        features: ['Alles aus Pro', 'Früher Zugang zu neuen Modulen', 'Eigener Support-Kanal'],
      },
    },
    cardPerYear: 'Jährlich',
    cardPerMonth: 'Monatlich',
    signUpToSubscribe: 'Nach Registrierung abschließen',
    manageSub: 'Abo verwalten',
    subscribeNow: 'Jetzt abonnieren',
    cnBuyPrefix: 'Kaufen: ',
    cnPackNote: (days) =>
      `Einmalige Zahlung (China) · ein Kauf pro Nutzer pro ${days}-Tage-Zyklus · Tokens verfallen nie`,
    topupHeading: 'Top-up-Pakete (einmalig kaufen, verfallen nie)',
    topupDesc: 'Kein Abo nötig, oder nur gelegentlich Mehrverbrauch. Jederzeit kaufbar.',
    buyNow: 'Jetzt kaufen',
    signUpToBuy: 'Nach Registrierung kaufen',
    faqEyebrow: 'Rund um die Preise',
    faqTitle: 'Ein paar Details, die oft gefragt werden.',
    faq: [
      {
        q: 'Wie rechnet MuiCV ab?',
        a: 'LLM-Aufrufe werden direkt nach Upstream-Prompt- und Completion-Tokens erfasst und zum Preis umgerechnet, inklusive Cache-Anteil zum Upstream-Tarif; PDF-Rendering kostet 200 Tokens pro Vorgang; JD-Scraping kostet 300 Tokens pro Vorgang. Alle Aufrufe erscheinen in der Konsole im Verlauf.',
      },
      {
        q: 'Worin unterscheiden sich monatliche und jährliche Zahlung?',
        a: 'Jährlich ist rund 17 % günstiger; die Tokens gibt es dann auf einen Schlag fürs ganze Jahr und du kannst sie ab dem Zahltag konzentriert nutzen. Nach einer Kündigung bleiben alle bereits gewährten Tokens erhalten und verfallen nie. Monatlich eignet sich zum Ausprobieren, jährlich für die langfristige Nutzung.',
      },
      {
        q: 'Kann ich Abo und Top-up-Pakete gleichzeitig nutzen?',
        a: 'Ja. Das Abo wird periodisch automatisch aufgeladen, Top-up-Pakete fügst du bei Bedarf manuell hinzu. Die Tokens aus beiden Quellen landen im selben Guthaben und werden ohne feste Reihenfolge verbraucht.',
      },
      {
        q: 'Kann ich jederzeit upgraden, downgraden oder kündigen?',
        a: 'Ja. „Abo verwalten“ in der Konsole öffnet das Stripe Customer Portal — dort kündigst du, wechselst den Tarif oder änderst die Zahlungsmethode. Gewährte Tokens verfallen nie; nach der Kündigung nutzt du dein altes Guthaben weiter. Abgerechnet wird nach tatsächlicher Nutzung, ohne Doppelbelastung.',
      },
      {
        q: 'Bekomme ich als Free-Nutzer monatlich Tokens nachgefüllt?',
        a: 'Nein. Bei der Registrierung gibt es einmalig 10.000 Tokens, mehr nicht. Wenn sie aufgebraucht sind, kannst du ein Top-up-Paket kaufen (am günstigsten ¥10 = 10K Tokens), ein Monats- / Jahresabo abschließen oder BYOK einbinden und das LLM über deine eigene API laufen lassen (PDF / JD werden weiterhin mit muicv-Tokens berechnet).',
      },
      {
        q: 'Gibt es eine Rückerstattung, wenn ich unzufrieden bin?',
        a: 'Abos sind innerhalb von 7 Tagen vollständig erstattungsfähig, solange die Hauptfunktionen nicht genutzt wurden — schreib uns eine E-Mail. Top-up-Pakete werden sofort gutgeschrieben und sind grundsätzlich nicht erstattungsfähig; bei versehentlichem Kauf oder größeren Problemen finden wir per E-Mail eine Lösung.',
      },
      {
        q: 'Ich habe woanders API gekauft — muss ich trotzdem zahlen?',
        a: 'Du kannst BYOK allein nutzen: Hinterlege API-Adresse und API-Key in der Konsole, dann laufen alle LLM-Aufrufe über dein eigenes API-Guthaben und verbrauchen keine muicv-Tokens. Mehrwertdienste wie PDF-Rendering / JD-Scraping werden jedoch weiterhin mit muicv-Tokens berechnet (diese Leistungen können nur wir erbringen).',
      },
      {
        q: 'Ich weiß nicht, wo ich API kaufen soll — hast du eine Empfehlung?',
        a: 'Ich habe außerdem muirouter entwickelt — ausschließlich Original-KI, unterstützt alle gängigen Produkte. Wenn du KI an mehr als einem Ort nutzt und dein KI-Budget besser einsetzen möchtest, probier es aus: https://muirouter.com.',
      },
      {
        q: 'Was bringt BYOK?',
        a: 'Wenn dir keines unserer Pakete zusagt — mal zu wenig, mal zu viel — oder du mehr als ein KI-Produkt nutzt, ist BYOK eine Überlegung wert. Dann kann das hier nicht verbrauchte Kontingent für andere KI-Produkte genutzt werden.',
      },
      {
        q: 'Kostet das Skill-Paket selbst etwas?',
        a: 'Nein. npx skills add in jeden KI-Agenten (Claude Code / Codex / Cursor usw.) ist völlig kostenlos — die Plattformabrechnung gilt nur für serverseitige Funktionen (PDF-Export / Stellensuche).',
      },
    ],
  },
  faq: [
    {
      q: 'Wo liegen meine Lebenslauf-Daten? Wer kann sie sehen?',
      a: (
        <>
          Alles liegt auf deinem eigenen Rechner — als reine Markdown-Dateien, vollständig in deiner Hand. Ob du ein
          Backup machst oder sie mit anderen teilst, entscheidest du. Unsere Server berühren Daten nur kurz, wenn du
          aktiv Funktionen wie PDF-Export oder Stellen-Scraping aufrufst, und verwerfen sie danach — wir speichern keine
          Lebenslauf-Inhalte.
        </>
      ),
      text: 'Alles liegt auf deinem eigenen Rechner — als reine Markdown-Dateien, vollständig in deiner Hand. Ob du ein Backup machst oder sie mit anderen teilst, entscheidest du. Unsere Server berühren Daten nur kurz, wenn du aktiv Funktionen wie PDF-Export oder Stellen-Scraping aufrufst, und verwerfen sie danach — wir speichern keine Lebenslauf-Inhalte.',
    },
    {
      q: 'Wie hoch sind die Kosten?',
      a: (
        <>
          Ein einheitliches Token-Guthaben:
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Bei der Registrierung einmalig 10.000 Tokens gratis</strong>, verfallen nie, bis sie aufgebraucht
              sind
            </li>
            <li>
              <strong>Abo</strong>: Pro / Max monatlich oder jährlich, Tokens werden pro Periode automatisch aufgeladen;
              jährlich gibt die ganze Jahresmenge auf einmal, ca. 17 % Rabatt
            </li>
            <li>
              <strong>Top-up-Pakete</strong>: einmalig 10K / 35K / 130K Tokens kaufen, jederzeit
            </li>
            <li>
              <strong>BYOK</strong>: eigene API-Adresse und Key in der Konsole hinterlegen, das LLM nutzt dein Guthaben;
              PDF / JD werden weiterhin mit muicv-Tokens berechnet
            </li>
          </ul>
          Cloud-Dienste (PDF-Export, Stellensuche usw.) werden nach Token abgerechnet. Die genauen Preise findest du auf
          der{' '}
          <a href="/pricing" className={faqLink}>
            Preisseite
          </a>
          .
        </>
      ),
      text: 'Ein einheitliches Token-Guthaben: bei der Registrierung einmalig 10.000 Tokens gratis, verfallen nie; Abos Pro / Max monatlich oder jährlich, Tokens werden pro Periode automatisch aufgeladen, jährlich ca. 17 % Rabatt; Top-up-Pakete einmalig 10K / 35K / 130K Tokens; BYOK bindet einen eigenen API-Key ein, damit das LLM dein Guthaben nutzt. Cloud-Dienste (PDF-Export, Stellensuche usw.) werden nach Token abgerechnet, Details auf der Preisseite.',
    },
    {
      q: 'Was ist BYOK?',
      a: (
        <>
          BYOK = Bring Your Own Key, also dein eigenes LLM-Guthaben. Nach dem Binden laufen alle KI-Aufrufe über dein
          eigenes Guthaben, und wir verbrauchen keine Plattform-Tokens mehr — ideal für Nutzer, die bereits ein LLM-Abo
          haben und ihre Kosten zentral steuern wollen.
        </>
      ),
      text: 'BYOK = Bring Your Own Key, also dein eigenes LLM-Guthaben. Nach dem Binden laufen alle KI-Aufrufe über dein eigenes Guthaben, und wir verbrauchen keine Plattform-Tokens mehr — ideal für Nutzer, die bereits ein LLM-Abo haben und ihre Kosten zentral steuern wollen.',
    },
    {
      q: 'Wann erscheint die Desktop-App?',
      a: (
        <>
          <strong>Sie ist bereits live</strong>, verfügbar für macOS / Windows / Linux. Hol dir die neueste Version auf
          der{' '}
          <a href="/download" className={faqLink}>
            Download-Seite
          </a>
          . Wer bereits einen KI-Agenten nutzt (Claude Code / Codex / Cursor usw.), kann auch direkt über das
          Skill-Paket einsteigen — beides ist möglich.
        </>
      ),
      text: 'Sie ist bereits live, verfügbar für macOS / Windows / Linux — die neueste Version gibt es auf der Download-Seite. Wer bereits einen KI-Agenten nutzt (Claude Code / Codex / Cursor usw.), kann auch direkt über das Skill-Paket einsteigen. Beides ist möglich.',
    },
    {
      q: 'Werden englische / zweisprachige Lebensläufe unterstützt?',
      a: (
        <>
          Ja. Ist dein Material in einer Sprache verfasst, folgt der Lebenslauf dieser Sprache; bei einer englischen
          Zielstelle wird der erzeugte Lebenslauf im englischen Stil geschrieben; zweisprachige Vorlagen sind bereits in
          Planung.
        </>
      ),
      text: 'Ja. Ist dein Material in einer Sprache verfasst, folgt der Lebenslauf dieser Sprache; bei einer englischen Zielstelle wird der erzeugte Lebenslauf im englischen Stil geschrieben; zweisprachige Vorlagen sind bereits in Planung.',
    },
    {
      q: 'Wird automatisch bei LinkedIn / Boss 直聘 beworben?',
      a: (
        <>
          Nein. Wir helfen nur beim Stellen-Scraping, beim Erstellen passgenauer Lebensläufe, beim Schreiben von
          Anschreiben und beim Ordnen einer Checkliste — den „Absenden“-Button drückst du selbst. Das ist Absicht, um
          Konto-Risiken und ToS-Verstöße zu vermeiden.
        </>
      ),
      text: 'Nein. Wir helfen nur beim Stellen-Scraping, beim Erstellen passgenauer Lebensläufe, beim Schreiben von Anschreiben und beim Ordnen einer Checkliste — den „Absenden“-Button drückst du selbst. Das ist Absicht, um Konto-Risiken und ToS-Verstöße zu vermeiden.',
    },
    {
      q: 'Für wen ist MuiCV gedacht?',
      a: (
        <>
          Für alle, die auf Jobsuche sind und ihren Lebenslauf oft überarbeiten — Berufseinsteiger, Jobwechsler,
          Quereinsteiger oder Menschen, die sich gleichzeitig auf viele Stellen bewerben. Wer schon mit einem KI-Agenten
          wie Claude Code oder Cursor arbeitet, kann das Skill direkt anbinden; wer keine Lust auf die Kommandozeile
          hat, lädt einfach die Desktop-App herunter. Du lieferst die Erfahrung, Mui macht daraus einen Lebenslauf, der
          zur Stelle passt.
        </>
      ),
      text: 'Für alle, die auf Jobsuche sind und ihren Lebenslauf oft überarbeiten — Berufseinsteiger, Jobwechsler, Quereinsteiger oder Menschen, die sich gleichzeitig auf viele Stellen bewerben. Wer schon mit einem KI-Agenten wie Claude Code oder Cursor arbeitet, kann das Skill direkt anbinden; wer keine Lust auf die Kommandozeile hat, lädt einfach die Desktop-App herunter. Du lieferst die Erfahrung, Mui macht daraus einen Lebenslauf, der zur Stelle passt.',
    },
    {
      q: 'Optimiert KI meinen Lebenslauf?',
      a: (
        <>
          Ja, aber nur auf Basis der Fakten, die du lieferst. Mui prüft Entwürfe nach STAR, quantifizierten Ergebnissen,
          Stellen-Keywords und Länge, zeigt auf, welcher Satz zu vage ist, welchem Abschnitt Daten fehlen und welche
          Keywords noch fehlen, und gibt direkt verwendbare Umformulierungen. Fügst du eine Ziel-Stellenbeschreibung
          ein, wählt es das Material für diese Stelle neu aus und schreibt es um. Erfahrung erfindet es nie.
        </>
      ),
      text: 'Ja, aber nur auf Basis der Fakten, die du lieferst. Mui prüft Entwürfe nach STAR, quantifizierten Ergebnissen, Stellen-Keywords und Länge, zeigt auf, welcher Satz zu vage ist, welchem Abschnitt Daten fehlen und welche Keywords noch fehlen, und gibt direkt verwendbare Umformulierungen. Fügst du eine Ziel-Stellenbeschreibung ein, wählt es das Material für diese Stelle neu aus und schreibt es um. Erfahrung erfindet es nie.',
    },
    {
      q: 'Was ist die offizielle MuiCV-Website?',
      a: (
        <>
          Es gibt nur eine: <strong>muicv.com</strong>, www.muicv.com leitet automatisch dorthin weiter. Der Produktname
          lautet MuiCV. Im Netz gibt es einige Lebenslauf-Tools mit ähnlichen Namen, die nichts mit uns zu tun haben;
          wenn du muicv.com speicherst oder suchst, landest du immer richtig.
        </>
      ),
      text: 'Es gibt nur eine: muicv.com, www.muicv.com leitet automatisch dorthin weiter. Der Produktname lautet MuiCV. Im Netz gibt es einige Lebenslauf-Tools mit ähnlichen Namen, die nichts mit uns zu tun haben; wenn du muicv.com speicherst oder suchst, landest du immer richtig.',
    },
  ],
};
