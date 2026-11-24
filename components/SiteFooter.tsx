import Link from 'next/link';
import { SITE } from '@/lib/site';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="in">
        <span>{SITE.name} · simulation indicative fondée sur la convention collective IDCC 3239. Aucune donnée n&apos;est envoyée : tout reste dans votre navigateur.</span>
        <Link href="/mentions-legales/">Mentions légales</Link>
      </div>
    </footer>
  );
}
