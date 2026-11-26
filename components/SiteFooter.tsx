import Link from 'next/link';
import { SITE } from '@/lib/site';
import { Logo } from './SiteHeader';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="in">
        <div className="f-brand">
          <Link href="/" className="brand"><Logo size={20} /> {SITE.name}</Link>
          <p>Simulation indicative fondée sur la convention collective des particuliers employeurs (IDCC 3239). Aucune donnée n&apos;est envoyée : tout reste dans votre navigateur.</p>
        </div>
        <nav className="f-col" aria-label="Simulateur">
          <b>Simulateur</b>
          <Link href="/simulateur/">Faire une simulation</Link>
          <Link href="/#calcul">Ce qui est calculé</Link>
          <Link href="/#fonctionnement">Comment ça marche</Link>
          <Link href="/#faq">Questions fréquentes</Link>
        </nav>
        <nav className="f-col" aria-label="Informations">
          <b>Informations</b>
          <Link href="/mentions-legales/">Mentions légales</Link>
        </nav>
      </div>
      <div className="in f-bottom">© {new Date().getFullYear()} {SITE.name}</div>
    </footer>
  );
}
