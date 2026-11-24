// Dates manipulées en « numéros de jour » UTC (entiers) pour éviter tout problème de fuseau horaire.
export const DAY = 86400000;

export const toN = (s: string): number => {
  if (!s) return NaN;
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
};
export const toS = (n: number): string => new Date(n * DAY).toISOString().slice(0, 10);
const D = (n: number) => new Date(n * DAY);
/** Jour de la semaine : 0 dimanche … 6 samedi */
export const wd = (n: number) => D(n).getUTCDay();
export const Y = (n: number) => D(n).getUTCFullYear();
export const M = (n: number) => D(n).getUTCMonth() + 1;
export const DD = (n: number) => D(n).getUTCDate();
export const dayOf = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / DAY;

export const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const MOISL = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

export const fmtDate = (n: number) => `${DD(n)} ${MOIS[M(n) - 1]} ${Y(n)}`;

/** Période de référence des congés payés (1er juin → 31 mai), désignée par l'année du 31 mai. */
export const periodOf = (n: number) => Y(n) + (M(n) >= 6 ? 1 : 0);

export function fmtPeriod(p: number, start: number, end: number) {
  const a = Math.max(dayOf(p - 1, 6, 1), start);
  const b = Math.min(dayOf(p, 5, 31), end);
  return `${fmtDate(a)} → ${fmtDate(b)}`;
}

/** Liste lisible de jours : « 4 jours : mar. 22, jeu. 24, du lun. 28 au ven. 31 déc. » */
export function daysText(list: number[]) {
  if (!list.length) return '';
  const s = [...list].sort((a, b) => a - b);
  const runs: number[][] = [[s[0]]];
  for (const d of s.slice(1)) {
    const run = runs[runs.length - 1];
    const prev = run[run.length - 1];
    const gap = d - prev;
    if (gap === 1 || (gap === 3 && wd(prev) === 5)) run.push(d);
    else runs.push([d]);
  }
  const one = (d: number) => `${JOURS[wd(d)]} ${DD(d)}`;
  const parts = runs.map((r) => (r.length === 1 ? one(r[0]) : `du ${one(r[0])} au ${one(r[r.length - 1])}`));
  return `${s.length} jour${s.length > 1 ? 's' : ''} : ${parts.join(', ')} ${MOIS[M(s[s.length - 1]) - 1]}`;
}
