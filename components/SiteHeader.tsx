'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  { href: '/#calcul', label: 'Ce qui est calculé' },
  { href: '/#fonctionnement', label: 'Comment ça marche' },
  { href: '/#faq', label: 'Questions' },
];

export default function SiteHeader() {
  const path = usePathname() || '/';
  const [open, setOpen] = useState(false);

  // Fermeture du menu mobile : changement de page ou touche Échap
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);
  // Logo : déjà sur l'accueil, le lien ne naviguerait pas (même adresse) ; on remonte en haut et on retire l'ancre éventuelle
  const goHome = (e: React.MouseEvent) => {
    close();
    if (path !== '/') return;
    e.preventDefault();
    if (location.hash) history.replaceState(null, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <header className={'site-header' + (open ? ' open' : '')}>
      <div className="in">
        <Link href="/" className="brand" onClick={goHome}><Logo /> {SITE.name}</Link>
        <button
          type="button"
          className="burger"
          aria-expanded={open}
          aria-controls="menu-principal"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>
        <div className="menu" id="menu-principal">
          <nav className="nav" aria-label="Navigation principale">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={close}>{l.label}</Link>
            ))}
          </nav>
          <Link href="/simulateur/" className="btn primary big head-cta" onClick={close}>Faire une simulation</Link>
        </div>
      </div>
    </header>
  );
}
