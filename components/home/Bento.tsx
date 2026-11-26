'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { rollTo, zeroed } from '@/lib/odometer';

type Player = { play: () => void; kill: () => void };

/** Planning : un curseur balaie la journée, les plages se remplissent derrière lui et les heures roulent. */
function scanPlayer(card: HTMLElement): Player | null {
  const plan = card.querySelector<HTMLElement>('[data-scan]');
  if (!plan) return null;
  const rows = Array.from(plan.querySelectorAll<HTMLElement>('[data-scan-row]'));
  const D = 1.5; // durée du balayage de 7 h à 19 h
  const reset = () => {
    plan.style.setProperty('--p', '0');
    rows.forEach((r) => { const h = r.querySelector<HTMLElement>('[data-odometer-element]')!; h.textContent = zeroed(h.dataset.value!); });
  };
  reset();
  let tl: gsap.core.Timeline | null = null;
  return {
    play() {
      if (tl?.isActive()) return;
      reset();
      plan.classList.add('scanning');
      tl = gsap.timeline({ onComplete: () => plan.classList.remove('scanning') });
      tl.fromTo(plan, { '--p': 0 }, { '--p': 1, duration: D, ease: 'none' }, 0);
      rows.forEach((r) => {
        const h = r.querySelector<HTMLElement>('[data-odometer-element]')!;
        const l = Number(r.dataset.l) / 100, w = Number(r.dataset.w) / 100;
        tl!.add(rollTo(h, h.dataset.value!, { duration: w * D, ease: 'none' }), l * D);
      });
    },
    kill() { tl?.kill(); },
  };
}

/** Fin de contrat : les montants apparaissent en fondu et leurs chiffres roulent depuis 0. */
function odometerPlayer(card: HTMLElement): Player | null {
  const group = card.querySelector<HTMLElement>('[data-odometer-group]');
  if (!group) return null;
  const els = Array.from(group.querySelectorAll<HTMLElement>('[data-odometer-element]'));
  els.forEach((e) => { e.style.opacity = '0'; });
  let tl: gsap.core.Timeline | null = null;
  return {
    play() {
      if (tl?.isActive()) return;
      tl = gsap.timeline();
      els.forEach((e, i) => {
        const at = 0.3 + i * 0.12;
        tl!.fromTo(e, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, at);
        tl!.add(rollTo(e, e.dataset.value!, { grow: true }), at);
      });
    },
    kill() { tl?.kill(); },
  };
}

/**
 * Grille de fonctionnalités : ajoute `is-in` à chaque carte quand elle entre à l'écran (animations CSS),
 * joue l'animation de son illustration à ce moment-là, puis la rejoue à chaque survol.
 * Sans JavaScript ou avec « réduire les animations », tout reste affiché tel quel.
 */
export default function Bento({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>('.fcard'));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const players = new Map<HTMLElement, Player>();
    if (!reduce) cards.forEach((c) => { const p = scanPlayer(c) ?? odometerPlayer(c); if (p) players.set(c, p); });

    const show = (c: HTMLElement) => { c.classList.add('is-in'); players.get(c)?.play(); };
    const onEnter = (e: Event) => { const c = e.currentTarget as HTMLElement; if (c.classList.contains('is-in')) players.get(c)?.play(); };

    // Cartes déjà visibles au chargement : animées tout de suite, sans état caché intermédiaire
    const pending = cards.filter((c) => {
      if (c.getBoundingClientRect().top < window.innerHeight * 0.9) { show(c); return false; }
      return true;
    });
    root.dataset.anim = 'on';
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { show(e.target as HTMLElement); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    pending.forEach((c) => io.observe(c));
    players.forEach((_, c) => c.addEventListener('mouseenter', onEnter));

    return () => {
      io.disconnect();
      players.forEach((p, c) => { c.removeEventListener('mouseenter', onEnter); p.kill(); });
    };
  }, []);

  return <div className="feat" ref={ref}>{children}</div>;
}
