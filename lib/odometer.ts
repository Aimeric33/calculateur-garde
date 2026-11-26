/**
 * Compteur à rouleaux (adapté de la ressource « Number Odometer » d'Osmo Supply).
 * Les helpers sont repris tels quels ; seul le déclenchement change : au lieu d'un ScrollTrigger,
 * `rollTo` renvoie une timeline GSAP que l'appelant lance quand il veut (apparition, survol…).
 * Le CSS associé (`[data-odometer-part]`) est dans app/globals.css.
 */
import { gsap } from 'gsap';

const defaults = {
  duration: 1,
  ease: 'power3.out',
  digitStagger: 0.04,
  revealDuration: 0.5,
  revealEase: 'power2.out',
  digitCycles: 2,
};

type Segment = { type: 'digit' | 'static'; char: string; startDigit?: number; hidden?: boolean };

const active = new WeakMap<HTMLElement, gsap.core.Timeline>();

export interface RollOptions {
  /** Valeur de départ (0 par défaut) */
  start?: number;
  duration?: number;
  ease?: string;
  /** Les colonnes de chiffres en trop s'ouvrent en largeur (sinon : zéros affichés dès le départ) */
  grow?: boolean;
}

/** Fait rouler les chiffres de `el` jusqu'à `text`. La timeline renvoyée peut être imbriquée. */
export function rollTo(el: HTMLElement, text: string, opts: RollOptions = {}): gsap.core.Timeline {
  const { start = 0, duration = defaults.duration, ease = defaults.ease, grow = false } = opts;
  active.get(el)?.kill();

  const step = getLineHeightRatio(el);
  let segments = parseSegments(text);
  segments = mapStartDigits(segments, start);
  segments = markHiddenSegments(segments, start);
  const { rollers, revealEls } = buildRollerDOM(el, segments, step, grow);

  const fontSize = parseFloat(getComputedStyle(el).fontSize);
  const revealData = revealEls.map((revealEl) => {
    const widthEm = revealEl.offsetWidth / fontSize;
    gsap.set(revealEl, { width: 0, overflow: 'hidden' });
    return { el: revealEl, widthEm };
  });

  const tl = gsap.timeline({
    onComplete() { cleanupElement(el, text); active.delete(el); },
  });
  active.set(el, tl);

  revealData.forEach(({ el: r, widthEm }) => {
    tl.to(r, { width: widthEm + 'em', opacity: 1, duration: defaults.revealDuration, ease: defaults.revealEase }, 0);
  });
  rollers.forEach(({ roller, targetPos }, digitIdx) => {
    const reversedIdx = rollers.length - 1 - digitIdx;
    tl.to(roller, { y: -targetPos * step + 'em', duration, ease, force3D: true }, reversedIdx * defaults.digitStagger);
  });
  return tl;
}

/** Remplace chaque chiffre par 0 (« 8,75 h » → « 0,00 h ») pour l'état de départ. */
export const zeroed = (text: string) => text.replace(/\d/g, '0');

// ---------- Helpers de la ressource ----------

function getLineHeightRatio(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const lh = cs.lineHeight;
  if (lh === 'normal') return 1.2;
  return parseFloat(lh) / parseFloat(cs.fontSize);
}

function parseSegments(text: string): Segment[] {
  return [...text].map((char) => ({ type: /\d/.test(char) ? 'digit' : 'static', char }));
}

function mapStartDigits(segments: Segment[], startValue: number): Segment[] {
  const digitSlots = segments.filter((s) => s.type === 'digit');
  const padded = String(Math.floor(Math.abs(startValue))).padStart(digitSlots.length, '0').slice(-digitSlots.length);
  let di = 0;
  return segments.map((s) => (s.type === 'digit' ? { ...s, startDigit: parseInt(padded[di++], 10) } : s));
}

function markHiddenSegments(segments: Segment[], startValue: number): Segment[] {
  const totalDigits = segments.filter((s) => s.type === 'digit').length;
  const absStart = Math.floor(Math.abs(startValue));
  const startDigitCount = absStart === 0 ? 1 : String(absStart).length;
  const leadingZeros = Math.max(0, totalDigits - startDigitCount);
  if (leadingZeros === 0) return segments;
  let digitsSeen = 0;
  let firstDigitSeen = false;
  let prevDigitHidden = false;
  return segments.map((seg) => {
    if (seg.type === 'digit') {
      firstDigitSeen = true;
      const hidden = digitsSeen < leadingZeros;
      prevDigitHidden = hidden;
      digitsSeen++;
      return { ...seg, hidden };
    }
    const hidden = firstDigitSeen && prevDigitHidden;
    return { ...seg, hidden };
  });
}

function buildRollerDOM(el: HTMLElement, segments: Segment[], step: number, grow: boolean) {
  el.innerHTML = '';
  el.style.height = '';
  const rollers: { roller: HTMLElement; targetPos: number }[] = [];
  const revealEls: HTMLElement[] = [];
  const totalCells = 10 * defaults.digitCycles;
  segments.forEach((seg) => {
    if (seg.type === 'static') {
      const span = document.createElement('span');
      span.setAttribute('data-odometer-part', 'static');
      span.style.height = step + 'em';
      span.style.lineHeight = String(step);
      span.textContent = seg.char;
      el.appendChild(span);
      if (grow && seg.hidden) {
        gsap.set(span, { opacity: 0 });
        revealEls.push(span);
      }
      return;
    }
    const mask = document.createElement('span');
    mask.setAttribute('data-odometer-part', 'mask');
    mask.style.height = step + 'em';
    mask.style.lineHeight = String(step);
    const roller = document.createElement('span');
    roller.setAttribute('data-odometer-part', 'roller');
    roller.style.lineHeight = String(step);
    const digits: number[] = [];
    for (let d = 0; d < totalCells; d++) digits.push(d % 10);
    roller.textContent = digits.join('\n');
    mask.appendChild(roller);
    el.appendChild(mask);
    const startDigit = seg.startDigit || 0;
    const isReveal = grow && seg.hidden;
    gsap.set(roller, { y: isReveal ? step + 'em' : -startDigit * step + 'em' });
    const endDigit = parseInt(seg.char, 10);
    const targetPos = endDigit > startDigit ? endDigit : 10 + endDigit;
    rollers.push({ roller, targetPos });
    if (isReveal) revealEls.push(mask);
  });
  return { rollers, revealEls };
}

function cleanupElement(el: HTMLElement, originalText: string) {
  el.style.overflow = '';
  el.style.height = '';
  const digits = [...originalText].filter((c) => /\d/.test(c));
  let di = 0;
  el.querySelectorAll<HTMLElement>('[data-odometer-part="mask"]').forEach((mask) => {
    mask.querySelector('[data-odometer-part="roller"]')?.remove();
    mask.textContent = digits[di++] || '';
    mask.style.opacity = '';
    mask.style.overflow = '';
  });
  el.querySelectorAll<HTMLElement>('[data-odometer-part="static"]').forEach((stat) => { stat.style.opacity = ''; });
}
