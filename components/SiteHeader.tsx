'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE } from '@/lib/site';

export function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M8 22V12l8-5 8 5v10" fill="none" stroke="var(--surface)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M13 22v-5h6v5" fill="none" stroke="var(--surface)" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  );
}

const LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/simulateur/', label: 'Simulateur' },
];

export default function SiteHeader() {
  const path = usePathname();
  const norm = (p: string) => (p.endsWith('/') ? p : p + '/');
  return (
    <header className="site-header">
      <div className="in">
        <Link href="/" className="brand"><Logo /> {SITE.name}</Link>
        <nav className="nav" aria-label="Navigation principale">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={norm(path || '/') === l.href ? 'page' : undefined}>{l.label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
