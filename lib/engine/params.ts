import { toN, wd, M, Y, dayOf } from './dates';
import { eur, hm, num } from './format';
import type { HolidayKey } from './holidays';
import { mkPhase, type CpMode, type Params, type PentMode, type Plan } from './simulate';

/** Un jour du planning : [coché, arrivée, départ] */
export type DaySlot = [boolean, string, string];
/** Clés 1 (lundi) … 6 (samedi) */
export type WeekPlan = Record<number, DaySlot>;

export interface FormState {
  start: string; end: string; rate: number; maj: number;
  days: WeekPlan;
  chg: { on: boolean; date: string; rate: number; days: WeekPlan };
  vacWeeks: number;
  vac: [string, string][];
  cpMode: CpMode; ferTrav: HolidayKey[]; ferMaj: number; pent: PentMode;
  ent: number; meal: number; ratio: number;
}

export const WEEKDAYS: [number, string][] = [[1, 'Lundi'], [2, 'Mardi'], [3, 'Mercredi'], [4, 'Jeudi'], [5, 'Vendredi'], [6, 'Samedi']];

const fullWeek = (): WeekPlan => ({
  1: [true, '08:45', '17:30'], 2: [true, '08:45', '17:30'], 3: [true, '08:45', '17:00'],
  4: [true, '08:45', '17:30'], 5: [true, '08:45', '17:30'], 6: [false, '08:30', '12:30'],
});

/** Exemple affiché au premier chargement. */
export const EXAMPLE: FormState = {
  start: '2027-01-04', end: '2029-08-31', rate: 4.3, maj: 25,
  days: fullWeek(),
  chg: { on: false, date: '2027-03-01', rate: 4.3, days: fullWeek() },
  vacWeeks: 8,
  vac: [
    ['2027-02-15', '2027-02-20'], ['2027-04-19', '2027-04-24'], ['2027-08-09', '2027-08-28'], ['2027-10-25', '2027-10-30'],
    ['2027-12-20', '2028-01-01'], ['2028-02-14', '2028-02-19'], ['2028-04-17', '2028-04-22'], ['2028-08-07', '2028-08-26'],
    ['2028-10-23', '2028-10-28'], ['2028-12-25', '2029-01-06'], ['2029-02-12', '2029-02-17'], ['2029-04-16', '2029-04-21'],
    ['2029-08-06', '2029-08-25'],
  ],
  cpMode: 'juin', ferTrav: [], ferMaj: 10, pent: 'chome',
  ent: 4.5, meal: 0, ratio: 78.12,
};

/** Minimums réglementaires (au 1er juin 2026). */
export const MIN_RATE_NET = 3.28;

const tmin = (t: string) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const slotHours = (d: DaySlot) => (d[0] ? Math.max(0, (tmin(d[2]) - tmin(d[1])) / 60) : 0);
export const weekHours = (w: WeekPlan) => WEEKDAYS.reduce((a, [i]) => a + slotHours(w[i]), 0);
const toPlan = (w: WeekPlan): Plan => { const pl = [0, 0, 0, 0, 0, 0, 0]; for (const [i] of WEEKDAYS) pl[i] = slotHours(w[i]); return pl; };

export const isComplete = (s: FormState) => s.vacWeeks <= 5;

export function buildParams(s: FormState): Params {
  const phases = [mkPhase(-Infinity, toPlan(s.days), s.rate, s.maj || 0)];
  const cd = toN(s.chg.date);
  if (s.chg.on && !isNaN(cd) && cd > toN(s.start) && cd <= toN(s.end)) {
    phases.push(mkPhase(cd, toPlan(s.chg.days), s.chg.rate || s.rate, s.maj || 0));
  }
  return {
    start: toN(s.start), end: toN(s.end), phases, weeksI: 52 - s.vacWeeks,
    vac: s.vac.map(([a, b]) => ({ a: toN(a), b: toN(b) })).filter((v) => !isNaN(v.a) && !isNaN(v.b) && v.b >= v.a),
    ent: s.ent, meal: s.meal, ratio: s.ratio || 78.12, maj: s.maj || 0,
    cpMode: s.cpMode, ferTrav: s.ferTrav, ferMaj: s.ferMaj, pent: s.pent,
  };
}

export interface Analysis {
  blocking: string | null;   // erreur qui empêche le calcul
  alerts: { title: string; text: string }[];
  chips: { label: string; bad: boolean }[];
  entMin: number; maxDay: number;
}

/** Contrôles de cohérence et rappels réglementaires. */
export function analyse(s: FormState, P: Params): Analysis {
  const alerts: Analysis['alerts'] = [];
  const maxDay = Math.max(...P.phases.map((ph) => Math.max(...ph.plan)));
  const entMin = Math.max(2.65, (3.92 * maxDay) / 9);
  const empty = { alerts, chips: [], entMin, maxDay };
  if (isNaN(P.start) || isNaN(P.end) || P.end <= P.start) return { blocking: 'La date de fin doit être après la date de début.', ...empty };
  if (P.phases.some((ph) => !ph.H)) return { blocking: `Cochez au moins un jour de garde avec ses horaires${s.chg.on ? ' dans chaque planning' : ''}.`, ...empty };

  if (s.chg.on && P.phases.length < 2) alerts.push({ title: 'Date du changement de planning à vérifier.', text: 'Elle doit tomber entre le début et la fin du contrat.' });
  if (Math.min(...P.phases.map((ph) => ph.rate)) < MIN_RATE_NET) alerts.push({ title: 'Salaire horaire sous le minimum.', text: `Le minimum est de ${eur(MIN_RATE_NET)} net de l'heure.` });
  if (s.ent > 0 && s.ent < entMin - 0.005) alerts.push({ title: 'Entretien sous le minimum.', text: `Pour une journée de ${hm(maxDay)}, il faut au moins ${eur(entMin)}.` });
  const H = Math.max(...P.phases.map((ph) => ph.H));
  if (H > 45 && s.maj < 10) alerts.push({ title: 'Majoration trop faible.', text: 'Les heures au-delà de 45 h doivent être majorées d\'au moins 10 %.' });
  if (H > 50) alerts.push({ title: 'Plus de 50 h par semaine.', text: 'La durée de travail d\'une assistante maternelle ne peut pas dépasser 48 h en moyenne sur 4 mois, ni 50 h par semaine.' });
  if (s.ferTrav.length && s.ferMaj < 10) alerts.push({ title: 'Majoration des fériés trop faible.', text: 'Un jour férié travaillé doit être majoré d\'au moins 10 %.' });
  if (s.ferTrav.includes('mai1')) alerts.push({ title: '1er mai travaillé.', text: 'Il ne peut être travaillé qu\'à titre exceptionnel et doit être prévu au contrat. Il est payé double.' });

  // Semaines de vacances saisies par période de référence (juin → mai)
  const phAt = (n: number) => { let k = P.phases[0]; for (const ph of P.phases) if (n >= ph.from) k = ph; return k; };
  const perY: Record<number, number> = {};
  for (let n = P.start; n <= P.end; n++) {
    const ph = phAt(n);
    if (ph.plan[wd(n)] > 0 && P.vac.some((v) => n >= v.a && n <= v.b)) { const p = Y(n) + (M(n) >= 6 ? 1 : 0); perY[p] = (perY[p] || 0) + 1 / ph.dpw; }
  }
  const chips: Analysis['chips'] = [];
  const p0 = Y(P.start) + (M(P.start) >= 6 ? 1 : 0), p1 = Y(P.end) + (M(P.end) >= 6 ? 1 : 0);
  for (let p = p0; p <= p1; p++) {
    const w = perY[p] || 0;
    const fullYear = dayOf(p - 1, 6, 1) >= P.start && dayOf(p, 5, 31) <= P.end;
    const bad = fullYear && Math.abs(w - s.vacWeeks) > 0.6;
    chips.push({ label: `${p - 1}-${p} : ${num(w, 1)} sem. saisies${fullYear ? ` / ${s.vacWeeks} prévues` : ''}`, bad });
    if (bad) alerts.push({ title: `Vacances ${p - 1}-${p} :`, text: `${num(w, 1)} semaines saisies alors que le contrat en prévoit ${s.vacWeeks}. La régularisation de fin de contrat corrigera l'écart, mais vérifiez les dates.` });
  }
  return { blocking: null, alerts, chips, entMin, maxDay };
}
