'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE } from '@/lib/site';

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="var(--copper)" />
      <path d="M9.5 21.5v-8.2L16 9l6.5 4.3v8.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M13.6 21.5v-4.4h4.8v4.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

const LINKS = [
  { href: '/simulateur/', label: 'Simulateur' },
  { href: '/#fonctionnement', label: 'Comment ça marche' },
  { href: '/#faq', label: 'Questions' },
];

export default function SiteHeader() {
  const path = usePathname() || '/';
  const norm = (p: string) => (p.endsWith('/') ? p : p + '/');
  const onSim = norm(path) === '/simulateur/';
  return (
    <header className="site-header">
      <div className="in">
        <Link href="/" className="brand"><Logo /> {SITE.name}</Link>
        <nav className="nav" aria-label="Navigation principale">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={norm(path) === l.href ? 'page' : undefined}>{l.label}</Link>
          ))}
        </nav>
        {!onSim && <Link href="/simulateur/" className="btn primary sm head-cta">Faire une simulation</Link>}
      </div>
    </header>
  );
}
