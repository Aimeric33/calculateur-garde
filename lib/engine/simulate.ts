import { M, Y, DD, JOURS, MOIS, wd, dayOf, periodOf, fmtPeriod, daysText } from './dates';
import { isHoliday, holidayKey, type HolidayKey } from './holidays';
import { eur, num } from './format';

/* =====================================================================
   Moteur de calcul — convention collective des particuliers employeurs
   (IDCC 3239). Tout est en net. Règles appliquées :
   - mensualisation : heures (45 h max) × taux × semaines ÷ 12 ;
   - heures au-delà de 45 h : payées en plus chaque mois, au réel ;
   - congés payés : 2,5 j ouvrables / 4 semaines, période juin → mai,
     maintien de salaire ou 10 %, le plus favorable ;
   - retenues (année complète) : salaire × heures d'absence ÷ heures prévues ;
   - congés décomptés en jours ouvrables (lundi → samedi) ;
   - fin de contrat : congés non pris, régularisation (année incomplète),
     indemnité de rupture (1/80 des salaires bruts dès 9 mois).
   ===================================================================== */

export type Formula = 'C' | 'I';            // année complète / incomplète
export type CpMode = 'juin' | 'principal' | 'prise';

/** Heures prévues par jour de la semaine (index 0 = dimanche … 6 = samedi). */
export type Plan = number[];

export interface Phase {
  from: number;          // premier jour d'application (−∞ pour le planning de départ)
  plan: Plan;
  rate: number;          // taux horaire net
  H: number;             // heures par semaine
  Hn: number;            // heures normales (≤ 45)
  Hs: number;            // heures majorées par semaine (> 45)
  rateS: number;         // taux majoré
  weekVal: number;       // valeur d'une semaine complète, heures majorées comprises
  baseVal: number;       // valeur des heures normales d'une semaine
  dpw: number;           // jours de garde par semaine
  full?: number;         // salaire mensualisé (selon la formule)
}

export interface Params {
  start: number;
  end: number;
  phases: Phase[];
  weeksI: number;        // semaines d'accueil en année incomplète
  vac: { a: number; b: number }[];
  ent: number;
  meal: number;
  ratio: number;         // net / brut en %
  maj: number;
  cpMode: CpMode;
  ferTrav: HolidayKey[];
  ferMaj: number;
}

export interface MonthRow {
  m0: number; y: number; mo: number; p: number;
  schedH: number; partial: boolean; mensDet: string;
  mens: number; ded: number; dedDet: string; unpaidH: number; unpaidTxt: string;
  cpPay: number; cpTxt: string;
  majH: number; majPay: number; ferPay: number; extraPay: number; extraLines: string[];
  pay: number; gardeDays: number; workedH: number; workedVal: number; ferH: number;
  rateTxt: string; dpw: number; vacDays: number; acq: number; bankBefore: number; pris: number; coveredH: number;
  ent: number; meal: number;
}

export interface ClosedPeriod { p: number; weeks: number; days: number; maint: number; dix: number; weekVal: number; value: number }
export interface CurrentPeriod { weeks: number; days: number; raw: number; maint: number; dix: number; weekVal: number; value: number }
export interface IccpLine { label: string; maint: number; dix: number; value: number }
export interface RegLine { ph: Phase; due: number; paid: number; value: number }

export interface SimResult {
  F: Formula; phases: Phase[]; H: number; Hs: number; rateS: number; weeks: number; full: number; weekVal: number;
  rows: MonthRow[]; closed: Record<number, ClosedPeriod>; cur: CurrentPeriod | null;
  iccp: number; iccpLines: IccpLine[]; regLines: RegLine[]; regRaw: number; reg: number;
  totPay: number; salaires: number; brut: number; rupture: number; ancMonths: number; ent: number; grand: number;
}

export function mkPhase(from: number, plan: Plan, rate: number, maj: number): Phase {
  const H = plan.reduce((a, b) => a + b, 0), Hn = Math.min(H, 45), Hs = Math.max(0, H - 45), rateS = rate * (1 + maj / 100);
  return { from, plan, rate, H, Hn, Hs, rateS, weekVal: Hn * rate + Hs * rateS, baseVal: Hn * rate, dpw: plan.filter((h) => h > 0).length };
}

export function simulate(P: Params, F: Formula): SimResult {
  const S = P.start, E = P.end;
  const PH: Phase[] = P.phases.map((ph) => ({ ...ph }));
  const weeks = F === 'C' ? 52 : P.weeksI;
  PH.forEach((ph) => (ph.full = (ph.baseVal * weeks) / 12));
  const phIdx = (n: number) => { let k = 0; for (let i = 1; i < PH.length; i++) if (n >= PH[i].from) k = i; return k; };
  const phOf = (n: number) => PH[phIdx(n)];
  const hrs = (n: number) => phOf(n).plan[wd(n)] || 0;
  const isVac = (n: number) => P.vac.some((v) => n >= v.a && n <= v.b);
  const ferWorked = (n: number) => { const k = holidayKey(n); return !!k && P.ferTrav.includes(k); };
  const isHolC = (n: number) => isHoliday(n) && !ferWorked(n); // férié chômé

  // Heures majorées réellement faites (au-delà de 45 h, semaine du lundi au dimanche)
  // et heures dues au titre du salaire mensualisé (45 h par semaine au plus, fériés payés compris).
  const majOf: Record<number, number> = {}, dueOf: Record<number, number> = {};
  {
    let cum = 0, cumD = 0;
    for (let n = S; n <= E; n++) {
      if (wd(n) === 1) { cum = 0; cumD = 0; }
      const h = hrs(n);
      if (h > 0 && !isVac(n)) {
        dueOf[n] = Math.min(h, Math.max(0, 45 - cumD)); cumD += h;
        if (!isHolC(n)) { const before = cum; cum += h; const m = Math.max(0, cum - Math.max(45, before)); if (m > 0) majOf[n] = m; }
      }
    }
  }

  let bank = 0, bankFrom: number | null = null;
  const acqW: Record<number, number> = {}, paid: Record<number, number> = {};
  const closed: Record<number, ClosedPeriod> = {}, due: Record<string, number> = {};
  const pend: Record<number, { value: number; days: number; left: number; taken: number }> = {};
  const regAcc = PH.map(() => ({ due: 0, paid: 0 }));
  const rows: MonthRow[] = [];

  let m0 = dayOf(Y(S), M(S), 1);
  while (m0 <= E) {
    const y = Y(m0), mo = M(m0);
    const m1 = dayOf(mo === 12 ? y + 1 : y, mo === 12 ? 1 : mo + 1, 1);
    const days: number[] = []; for (let n = m0; n < m1; n++) days.push(n);
    const inR = days.filter((n) => n >= S && n <= E && hrs(n) > 0);

    // Salaire mensualisé, au prorata pour chaque planning présent dans le mois
    const ks = [...new Set(days.filter((n) => n >= S && n <= E).map(phIdx))];
    const parts = ks.map((k) => {
      const ph = PH[k];
      const schedH = days.reduce((a, n) => a + (ph.plan[wd(n)] || 0), 0);
      const mine = inR.filter((n) => phIdx(n) === k);
      const inH = mine.reduce((a, n) => a + hrs(n), 0);
      return { k, ph, schedH, inH, mens: schedH ? (ph.full! * inH) / schedH : 0, mine };
    });
    const mens = parts.reduce((a, x) => a + x.mens, 0);
    const p = periodOf(Math.max(m0, S));

    // Congés payés : ouverture des droits au 1er juin, décompte en jours ouvrables
    if (mo === 6 && closed[p - 1]) { bank = closed[p - 1].days; bankFrom = p - 1; }
    const bankBefore = bank;
    const covered = new Set<number>(); let coveredH = 0, pris = 0;
    for (const n of days) {
      if (n >= S && n <= E && isVac(n) && wd(n) >= 1 && wd(n) <= 6 && !isHoliday(n) && bank >= 1) {
        bank--; pris++;
        if (hrs(n) > 0) { covered.add(n); coveredH += hrs(n); }
      }
    }

    // Retenues pour congés sans solde (année complète)
    const unpaid = inR.filter((n) => isVac(n) && !isHoliday(n) && !covered.has(n));
    let ded = 0; const dedDet: string[] = [], mensDet: string[] = [];
    for (const x of parts) {
      const uH = unpaid.filter((n) => phIdx(n) === x.k).reduce((a, n) => a + hrs(n), 0);
      if (F === 'C' && x.schedH && uH > 0) {
        ded += (x.ph.full! * uH) / x.schedH;
        dedDet.push(`${eur(x.ph.full!)} × ${num(uH)} h${coveredH ? ' non couvertes par les CP' : ''} / ${num(x.schedH)} h`);
      }
      if (x.inH < x.schedH - 1e-9 || parts.length > 1) mensDet.push(`${eur(x.ph.full!)} × ${num(x.inH)} h / ${num(x.schedH)} h`);
    }
    const unpaidH = unpaid.reduce((a, n) => a + hrs(n), 0);

    // Versement des congés payés en année incomplète, selon la modalité du contrat
    let cpPay = due[`${y}-${mo}`] || 0; delete due[`${y}-${mo}`];
    let cpTxt = '';
    if (F === 'I') {
      for (const q of Object.keys(pend).map(Number).sort()) {
        const pd = pend[q]; if (pd.left < 0.005) continue;
        let amt = 0;
        if (q < p - 1 && mo === 6) { amt = pd.left; cpTxt = `solde des congés ${q - 1}-${q}`; }
        else if (P.cpMode === 'juin') { if (mo === 6 && q === p - 1) { amt = pd.left; cpTxt = `congés ${q - 1}-${q} · versés en juin`; } }
        else if (bankFrom === q && pris > 0) {
          pd.taken += pris;
          if (P.cpMode === 'prise') { amt = Math.min(pd.left, (pd.value * pris) / pd.days); cpTxt = `congés ${q - 1}-${q} · ${pris} j pris × ${eur(pd.value / pd.days)}`; }
          else if (pd.taken >= Math.min(12, pd.days)) { amt = pd.left; cpTxt = `congés ${q - 1}-${q} · congé principal`; }
        }
        pd.left -= amt; cpPay += amt;
      }
    }

    // Jours de garde, heures majorées et jours fériés travaillés
    const garde = inR.filter((n) => !isVac(n) && !isHolC(n));
    const majH = garde.reduce((a, n) => a + (majOf[n] || 0), 0);
    const majPay = garde.reduce((a, n) => a + (majOf[n] || 0) * phOf(n).rateS, 0);
    const majRates = [...new Set(garde.filter((n) => majOf[n]).map((n) => phOf(n).rateS))];
    let ferPay = 0; const ferLines: string[] = [];
    for (const n of garde.filter(isHoliday)) {
      const k = holidayKey(n), h = hrs(n), r = phOf(n).rate;
      const t = k === 'mai1' ? 100 : P.ferMaj;
      ferPay += (h * r * t) / 100;
      ferLines.push(`${k === 'mai1' ? '1er mai' : `${JOURS[wd(n)]} ${DD(n)} férié`} : ${num(h)} h × ${eur(r)} × ${num(t)} %`);
    }
    const pay = mens - ded + cpPay + majPay + ferPay;
    const workedH = garde.reduce((a, n) => a + hrs(n), 0);
    const workedVal = garde.reduce((a, n) => a + hrs(n) * phOf(n).rate + (majOf[n] || 0) * (phOf(n).rateS - phOf(n).rate), 0);
    const fer = inR.filter((n) => isHolC(n) && !isVac(n));
    const ferH = fer.reduce((a, n) => a + hrs(n), 0);

    // Acquisition des congés : semaines travaillées (fériés et congés pris assimilés)
    let w = pris / 6;
    for (const n of garde.concat(fer)) w += hrs(n) / phOf(n).H;
    acqW[p] = (acqW[p] || 0) + w;
    paid[p] = (paid[p] || 0) + pay;
    for (const x of parts) {
      regAcc[x.k].due += x.mine.reduce((a, n) => a + (dueOf[n] || 0), 0);
      regAcc[x.k].paid += x.ph.rate ? x.mens / x.ph.rate : 0;
    }

    const main = parts.length ? parts[parts.length - 1] : { ph: PH[0], schedH: 0, inH: 0 };
    const extraLines = (majH ? [`${num(majH)} h au-delà de 45 h × ${majRates.length === 1 ? eur(majRates[0]) : 'taux majoré'}`] : []).concat(ferLines);
    rows.push({
      m0, y, mo, p,
      schedH: parts.reduce((a, x) => a + (parts.length > 1 ? x.inH : x.schedH), 0),
      partial: mensDet.length > 0, mensDet: mensDet.join(' + '),
      mens, ded, dedDet: dedDet.join(' + '), unpaidH, unpaidTxt: daysText(unpaid), cpPay, cpTxt,
      majH, majPay, ferPay, extraPay: majPay + ferPay, extraLines,
      pay, gardeDays: garde.length, workedH, workedVal, ferH,
      rateTxt: parts.length === 1 ? eur(main.ph.rate) : 'taux du planning', dpw: main.ph.dpw,
      vacDays: inR.filter(isVac).length, acq: (w * 2.5) / 4, bankBefore, pris, coveredH,
      ent: garde.length * P.ent, meal: garde.length * P.meal,
    });

    // Clôture de la période de référence au 31 mai
    if (mo === 5 && acqW[p] !== undefined) {
      const nd = Math.min(30, Math.ceil((acqW[p] * 2.5) / 4 - 1e-9));
      const wv = phOf(Math.min(dayOf(y, 6, 1), E)).weekVal;
      const maint = (nd / 6) * wv, dix = 0.1 * paid[p];
      closed[p] = { p, weeks: acqW[p], days: nd, maint, dix, weekVal: wv, value: Math.max(maint, dix) };
      if (F === 'I') pend[p] = { value: closed[p].value, days: nd, left: closed[p].value, taken: 0 };
      else if (dix > maint) due[`${y}-6`] = dix - maint;
    }
    m0 = m1;
  }

  // ---------- Fin de contrat ----------
  const last = phOf(E), weekVal = last.weekVal;
  const pc = periodOf(E);
  let cur: CurrentPeriod | null = null;
  let iccp = 0; const iccpLines: IccpLine[] = [];
  if (!closed[pc]) {
    const weeksCur = acqW[pc] || 0, raw = (weeksCur * 2.5) / 4, nd = Math.min(30, Math.ceil(raw - 1e-9));
    const maint = (nd / 6) * weekVal, dix = 0.1 * (paid[pc] || 0);
    cur = { weeks: weeksCur, days: nd, raw, maint, dix, weekVal, value: Math.max(maint, dix) };
    iccp += cur.value;
    iccpLines.push({ label: `Période en cours (${fmtPeriod(pc, S, E)}) : ${num(raw)} j arrondis à ${nd} j`, maint, dix, value: cur.value });
  }
  for (const q of Object.keys(pend).map(Number)) {
    const pd = pend[q];
    if (F === 'I' && pd.left > 0.005) {
      iccp += pd.left;
      iccpLines.push({ label: `Congés ${q - 1}-${q} acquis, pas encore versés`, maint: closed[q].maint, dix: closed[q].dix, value: pd.left });
    }
  }
  if (F === 'C') {
    if (bank > 0 && bankFrom) {
      const c = closed[bankFrom], maint = (bank / 6) * weekVal, dix = (0.1 * paid[bankFrom] * bank) / c.days, v = Math.max(maint, dix);
      iccp += v; iccpLines.push({ label: `Reliquat ${bankFrom - 1}-${bankFrom} : ${bank} j non pris`, maint, dix, value: v });
    }
    if (closed[pc] && M(E) >= 5 && bankFrom !== pc) {
      const c = closed[pc]; iccp += c.value;
      iccpLines.push({ label: `Congés ${pc - 1}-${pc} : ${c.days} j non pris`, maint: c.maint, dix: c.dix, value: c.value });
    }
  }
  const regLines: RegLine[] = PH
    .map((ph, k) => ({ ph, due: regAcc[k].due, paid: regAcc[k].paid, value: (regAcc[k].due - regAcc[k].paid) * ph.rate }))
    .filter((l) => l.due || l.paid);
  const regRaw = F === 'I' ? regLines.reduce((a, l) => a + l.value, 0) : 0;
  const reg = Math.max(0, regRaw);
  const totPay = rows.reduce((a, r) => a + r.pay, 0);
  const salaires = totPay + iccp + reg;
  const ancMonths = Math.floor((E - S + 1) / 30.4375);
  const brut = salaires / (P.ratio / 100);
  const rupture = ancMonths >= 9 ? brut / 80 : 0;
  const ent = rows.reduce((a, r) => a + r.ent + r.meal, 0);
  return {
    F, phases: PH, H: last.H, Hs: last.Hs, rateS: last.rateS, weeks, full: last.full!, weekVal,
    rows, closed, cur, iccp, iccpLines, regLines, regRaw, reg, totPay, salaires, brut, rupture, ancMonths, ent,
    grand: salaires + rupture,
  };
}

/** Mois de versement des congés d'une période (année incomplète). */
export function cpPaidText(R: SimResult, p: number) {
  const l = R.rows
    .filter((x) => x.cpPay > 0.005 && x.cpTxt.includes(`${p - 1}-${p}`))
    .map((x) => `${MOIS[x.mo - 1]} ${x.y} : ${eur(x.cpPay)}`);
  const end = R.iccpLines.find((x) => x.label.startsWith(`Congés ${p - 1}-${p} acquis`));
  if (end) l.push(`fin de contrat : ${eur(end.value)}`);
  return l.join(' · ');
}
