import type { Dictionary } from './types';

// English dictionary. English-native marketing copy, not a literal translation.
// FAQ accordion Q&A (JSX) lives in _sections/faq-items.tsx instead, see the comment there.

export const en: Dictionary = {
  brand: { name: 'MuiCV', by: 'by Mui 🐾' },
  nav: {
    links: [
      { label: 'Articles', href: '/posts/jobs' },
      { label: 'Skills', href: '/skills' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Download', href: '/download' },
    ],
    console: 'Open console',
    signIn: 'Log in',
    signUp: 'Sign up',
  },
  footer: {
    tagline:
      'The all-in-one AI job-search platform. Resumes, job matching, mock interviews, and career coaching — to help you land a better offer.',
    curatedBy: 'Curated by Mui the corgi',
    cols: [
      {
        label: 'Product',
        links: [
          { label: 'Features', href: '/#features' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'Desktop app', href: '/download' },
          { label: 'Skills', href: '/skills' },
          { label: 'Console', href: '/dashboard' },
        ],
      },
      {
        label: 'Content',
        links: [
          { label: 'Job articles', href: '/posts/jobs' },
          { label: 'All articles', href: '/posts' },
          { label: 'Changelog', href: '/changelog' },
        ],
      },
      {
        label: 'Company',
        links: [
          { label: 'About', href: '/about' },
          { label: 'Contact', href: '/contact' },
        ],
      },
      {
        label: 'Legal',
        links: [
          { label: 'Terms', href: '/terms' },
          { label: 'Privacy', href: '/privacy' },
        ],
      },
    ],
    copyright: '© 2026 Meathill LLC · MuiCV · All rights reserved',
    madeIn: 'Made with 🐾 in China',
  },
  hero: {
    badge: 'Desktop app is live — start from a single piece of material',
    titleA: 'Hand your resume and experience',
    titleHighlight: 'to Mui',
    titleEnd: '.',
    lede: 'Download the desktop app and import your existing resume or paste one experience. Mui first organizes it into a reusable career library, then generates, reviews, and exports a tailored resume for each role.',
    ctaDownload: 'Download desktop app',
    ctaSteps: 'See the 3 steps',
    accountSignedIn: 'Go to dashboard',
    accountSignedOut: 'Sign up',
    agentNote:
      'Already comfortable with Claude Code, Codex, or Cursor? The skill install path is further down the page — keep your usual toolchain.',
  },
  heroShowcase: {
    tabsAria: 'Switch demo',
    slides: { import: 'Import', library: 'Library', resume: 'Tailor' },
    caption: 'Organize first, then iterate per role',
    importHeader: 'MuiCV · Step 1',
    importTitle: 'Drop in something real first',
    importDesc:
      'Upload a resume, paste an experience, or just say “I want to start from scratch.” Mui begins from what you already have.',
    importItems: [
      { title: 'resume.pdf', desc: 'Parsed into editable material' },
      { title: 'A project story', desc: 'Fill in context, action, result' },
      { title: 'Target job link', desc: 'Used later to generate versions' },
    ],
    libraryHeader: 'Career library',
    libraryNavLabel: 'Nav',
    libraryNav: ['Experience', 'Projects', 'Skills', 'Jobs'],
    libraryListLabel: 'Reusable material',
    libraryItems: [
      { title: 'Led the membership growth platform', match: 'Quantified' },
      { title: 'Rebuilt the frontend release pipeline', match: 'Ready' },
      { title: 'Drove cross-team tracking standards', match: 'To do' },
    ],
  },
  features: {
    eyebrow: 'What it does',
    titleA: 'Get your material in order,',
    titleHighlight: 'then tailor',
    titleEnd: '.',
    lede: "Mui's core isn't writing fiction for you — it organizes real experience into reusable material, then adjusts the wording for each role.",
    statusLive: 'Live',
    statusSoon: 'Coming soon',
    items: [
      {
        id: 'organize',
        title: 'Organize career material',
        desc: 'Break your existing resume, projects, skills, and highlights into reusable material. Every application starts from the same source.',
        status: 'live',
        highlights: ['Import resume', 'Fill gaps', 'Local files'],
      },
      {
        id: 'generate',
        title: 'Generate per role',
        desc: 'Give Mui a target job and it selects, ranks, and rewrites from your library into a resume version that fits better.',
        status: 'live',
        highlights: ['Job scraping', 'Match scoring', 'Versioning'],
      },
      {
        id: 'review',
        title: 'Review and export',
        desc: 'Check drafts against STAR, metrics, keywords, and length, then export an A4 PDF — less scrambling right before you apply.',
        status: 'live',
        highlights: ['7-point review', 'Edit suggestions', 'PDF export'],
      },
      {
        id: 'practice',
        title: 'Keep practicing the search',
        desc: 'Once your material is stable, keep going with mock interviews, cover letters, and an application checklist. Advanced tools show up when you need them.',
        status: 'soon',
        highlights: ['Mock interview', 'Cover letter', 'Application checklist'],
      },
    ],
  },
  workflow: {
    eyebrow: 'How to start',
    titleA: 'The first time you open it,',
    titleHighlight: 'just three things',
    titleEnd: '.',
    aside:
      'Finish your first piece of career material — no rush to understand every feature. Resume versions, job matching, and export all grow from here.',
    steps: [
      {
        title: 'Import a resume or paste experience',
        desc: 'No concepts to learn first. Drop in a PDF, doc, or a project story you already have, and Mui starts from real material.',
      },
      {
        title: 'Organize into a reusable library',
        desc: 'Experience, projects, and skills become Markdown files stored on your own computer. No starting over each time you edit.',
      },
      {
        title: 'Generate, review, and export per role',
        desc: 'With a library in place, paste a job link or description; Mui generates a version, checks for issues, and exports a ready-to-send PDF.',
      },
    ],
  },
  desktopApp: {
    badge: 'Desktop app · Live',
    titleA: 'New to AI agents?',
    titleHighlight: 'Just download',
    titleEnd: '.',
    lede: 'A cross-platform desktop app. It walks you through importing a resume or recording your first experience, then on to job matching, resume review, and PDF export.',
    ctaDownload: 'Download desktop app',
    ctaAdvanced: 'Already use an AI agent? Advanced path ↓',
    platforms: [
      { name: 'macOS', sub: 'Apple Silicon · Intel' },
      { name: 'Windows', sub: 'x64 · NSIS installer' },
      { name: 'Linux', sub: 'x86_64 · AppImage' },
    ],
    downloadLabel: 'Download',
    noteBefore: 'Version and installer size are pulled from ',
    noteLink: 'the download page',
    noteAfter:
      ' automatically from the latest GitHub Releases. If your OS blocks the first run, the lower half of the download page explains how to allow it.',
  },
  install: {
    badge: 'Advanced path · for people who know AI tools',
    titleA: 'Already on Claude Code / Codex?',
    titleHighlight: 'Just add the skill',
    titleEnd: '.',
    lede: 'This is the advanced path, for people already working inside an AI agent. Regular job seekers will have a smoother time with the desktop app.',
    noteBefore: 'New to AI agents? ',
    noteLink: 'Download the desktop app',
    noteAfter: ' to start right away — available on macOS / Windows / Linux.',
    cardMeta: 'Works across agents / 40+ compatible',
  },
  faq: {
    eyebrow: 'FAQ',
    titleA: "What you're wondering is",
    titleHighlight: 'probably',
    titleEnd: ' here.',
    articlesEyebrow: 'Job articles',
    articlesTitle: 'Resumes, interviews, and offers — read one when you hit a wall.',
    articlesLede:
      'A running collection of common sticking points in the search: how to revise a resume, how to prep for interviews, how to judge whether an opportunity is worth it.',
    articlesCta: 'To the content hub',
    articlesEmpty: 'Articles are still in the works. Check the content hub for sections already open.',
  },
  download: {
    eyebrow: 'Desktop app',
    title: 'Download MuiCV',
    lede: 'No need to install Claude Code or learn skills first. Open the app, import a resume or record your first experience, and Mui guides you to a career library you can keep iterating on.',
    firstMinuteLabel: 'Your first minute after downloading',
    firstMinuteSteps: [
      {
        title: 'Log in to your muicv account',
        desc: 'Authorize in the browser; the app returns to a logged-in state automatically.',
      },
      {
        title: 'Import a resume or start fresh',
        desc: 'Upload an existing resume, or just describe a project and experience you have.',
      },
      {
        title: 'Start your first organizing chat',
        desc: 'Mui breaks your material into reusable pieces first, then generates versions per role.',
      },
    ],
    releasedAt: 'Released',
    platforms: [
      { title: 'macOS · Apple Silicon', subtitle: 'M1 / M2 / M3 / M4', key: 'mac-arm64' },
      { title: 'macOS · Intel', subtitle: 'x64 (older Macs)', key: 'mac-x64' },
      { title: 'Windows', subtitle: 'x64 · NSIS installer', key: 'win' },
      { title: 'Linux', subtitle: 'x86_64 · AppImage', key: 'linux' },
    ],
    unsignedNote:
      'None of the builds are code-signed yet, so the first run needs a manual allow per the steps below; this step goes away once developer certificates are in place.',
    noArch: 'This build has no artifact for that architecture',
    downloadLabel: 'Download',
    noReleaseLead: "🐾 The desktop app can't fetch a release right now. In the meantime you can:",
    noReleaseSkill:
      'Already on an AI agent like Claude Code, Codex, or Cursor? Check the skill install command on the home page — it takes 5 seconds to plug in',
    noReleaseContactBefore: 'Questions or feedback? ',
    noReleaseContactLink: 'Contact us',
    firstRunTitle: '⚠️ First open needs an unlock',
    firstRunLede:
      'None of the three platforms are code-signed, so the OS will stop you. Follow the steps once to allow it, then double-click / run it directly afterward.',
    firstRunMacSteps: [
      'Drag the .dmg into /Applications',
      <>
        <strong>Right-click</strong> (or control-click) the app → <strong>Open</strong>
      </>,
      'After the prompt, click “Open” again; double-clicking works from then on',
    ],
    firstRunMacCliLabel: 'Command-line version (no GUI needed):',
    firstRunMacCli: 'xattr -d com.apple.quarantine /Applications/Mui简历.app',
    firstRunWinSteps: [
      'Double-click the downloaded .exe',
      <>
        Hit the SmartScreen warning → click <strong>More info</strong> → click <strong>Run anyway</strong>
      </>,
      'Pick an install path; it defaults to your user directory, no admin password needed',
    ],
    firstRunLinuxLede: 'After downloading the .AppImage, give it execute permission and run it directly:',
  },
  meta: {
    home: {
      title: 'MuiCV — AI Resume Builder & Optimizer to Land a Better Job',
      description:
        'MuiCV is an AI job-search platform that builds, optimizes, and tailors your resume for each role, then exports a clean A4 PDF. Your data stays local — plus mock interviews and cover letters.',
    },
    download: {
      title: 'Download MuiCV Desktop App (macOS / Windows / Linux)',
      description:
        'Download the MuiCV desktop app for macOS, Windows, and Linux. Import a resume or paste experience, organize career material locally, then generate, review, and export an AI-tailored PDF resume. Free download, data stays local.',
    },
  },
};
