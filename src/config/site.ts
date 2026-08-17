export const site = {
  name: 'Beyond The Basics',
  author: 'Om Jhamvar',
  url: 'https://beyondthebasics.me',
  blogUrl: 'https://blog.beyondthebasics.me',
  email: 'omjhamvar29@gmail.com',
  tagline: 'Builder. Learner. Thinker.',
  description:
    'Projects, achievements, and writing by Om Jhamvar — building in public across web, AI, and hardware.',
  ogImage: '/og/default.png',
  formspreeId: 'xzdajdnn',
  socials: [
    {
      label: 'GitHub',
      href: 'https://github.com/RXcodeWalker',
      kind: 'profile' as const,
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/om-jhamvar-22185b402',
      kind: 'profile' as const,
    },
  ],
  nav: [
    { label: 'Projects', href: '/projects', external: false },
    { label: 'Achievements', href: '/achievements', external: false },
    { label: 'Writing', href: 'https://blog.beyondthebasics.me', external: true },
    { label: 'About', href: '/about', external: false },
    { label: 'Contact', href: '/contact', external: false },
  ],
} as const;

export type SiteConfig = typeof site;
