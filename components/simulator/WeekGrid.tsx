'use client';
import { DD, M, MOIS, MOISL, WEEKDAYS, Y, dayOf, fmtDate, num, periodOf, toN, toS, wd, type FormState } from '@/lib/engine';

type Ranges = FormState['vac'];
type Span = { a: number; b: number };

/* ---------- Périodes de congés : ajout / retrait d'une semaine ---------- */

const toSpans = (vac: Ranges): Span[] =>
  vac.map(([a, b]) => ({ a: toN(a), b: toN(b) })).filter((v) => !isNaN(v.a) && !isNaN(v.b) && v.b >= v.a);
const fromSpans = (v: Span[]): Ranges => v.map(({ a, b }) => [toS(a), toS(b)] as [string, string]);

/** Trie et fusionne les périodes qui se touchent (un dimanche d'écart compris). */
function normalize(v: Span[]): Span[] {
  const s = [...v].sort((x, y) => x.a - y.a);
  const out: Span[] = [];
  for (const r of s) {
    const last = out[out.length - 1];
    if (last && r.a <= last.b + 2) last.b = Math.max(last.b, r.b);
    else out.push({ ...r });
  }
  return out;
}

/** Ajoute la semaine du lundi `mon` (lundi → samedi, comme les périodes saisies à la main). */
const addWeek = (v: Span[], mon: number) => normalize([...v, { a: mon, b: mon + 5 }]);

/** Retire la semaine du lundi `mon` (lundi → dimanche) en découpant les périodes qui la chevauchent. */
function removeWeek(v: Span[], mon: number): Span[] {
  const out: Span[] = [];
  for (const r of v) {
    if (r.b < mon || r.a > mon + 6) { out.push(r); continue; }
    if (r.a <= mon - 1) out.push({ a: r.a, b: mon - 1 });
    if (r.b >= mon + 7) out.push({ a: mon + 7, b: r.b });
  }
  // Un morceau réduit à un dimanche ne sert à rien
  return out.filter((r) => !(r.a === r.b && wd(r.a) === 0));
}

/* ---------- Grille ---------- */

interface Props { s: FormState; set: (p: Partial<FormState>) => void; start: number; end: number }

/**
 * Une rangée par période de référence (juin → mai), un clic par semaine de congé.
 * Chaque colonne est un mois ; ses cases sont les semaines qui commencent ce mois-là.
 */
export default function WeekGrid({ s, set, start, end }: Props) {
  // Jours d'accueil prévus (1 = lundi … 6 = samedi) pour savoir si une semaine est entièrement en congé
  const planned = WEEKDAYS.filter(([i]) => s.days[i][0]).map(([i]) => i);
  const workDays = planned.length ? planned : [1, 2, 3, 4, 5];
  const spans = toSpans(s.vac);
  const covered = (mon: number) =>
    workDays.filter((i) => { const d = mon + i - 1; return spans.some((r) => d >= r.a && d <= r.b); }).length;

  // Un clic (ou Entrée / Espace) bascule la semaine : ajoutée si elle était libre, retirée sinon
  const toggle = (mon: number) => {
    const next = covered(mon) > 0 ? removeWeek(spans, mon) : addWeek(spans, mon);
    set({ vac: fromSpans(next) });
  };

  if (isNaN(start) || isNaN(end) || end <= start) return null;
  const rows: number[] = [];
  for (let p = periodOf(start); p <= periodOf(end); p++) rows.push(p);

  return (
    <div className="wgrid">
      {rows.map((p) => {
        const from = dayOf(p - 1, 6, 1), to = dayOf(p, 5, 31);
        const fullYear = from >= start && to <= end;
        // Lundis de la période, regroupés par mois (juin → mai)
        let mon = from + ((8 - wd(from)) % 7);
        const months: number[][] = Array.from({ length: 12 }, () => []);
        for (; mon <= to; mon += 7) months[(M(mon) + 6) % 12].push(mon);
        let weeks = 0;
        months.flat().forEach((m) => { if (m + 5 >= start && m <= end) weeks += covered(m) / workDays.length; });
        const status = !fullYear ? 'part' : Math.abs(weeks - s.vacWeeks) <= 0.6 ? 'ok' : 'bad';
        return (
          <div className="wg-row" key={p}>
            <div className="wg-h">
              <b>Juin {p - 1} → mai {p}</b>
              <span className={`wg-count ${status}`}>
                {num(weeks, 1)}{fullYear ? ` / ${s.vacWeeks}` : ''} sem.{!fullYear && ' · année partielle du contrat'}
              </span>
            </div>
            <div className="wg-months">
              {months.map((list, k) => (
                <div className="wg-month" key={k}>
                  <span className="wg-m" aria-hidden="true"><span className="l">{MOIS[(k + 5) % 12].replace('.', '')}</span><span className="s">{MOIS[(k + 5) % 12][0].toUpperCase()}</span></span>
                  {list.map((m) => {
                    const inContract = m + 5 >= start && m <= end;
                    const c = covered(m);
                    const state = c === 0 ? 'off' : c >= workDays.length ? 'on' : 'part';
                    return (
                      <button
                        key={m}
                        type="button"
                        className="wg-w"
                        data-state={state}
                        disabled={!inContract}
                        aria-pressed={state !== 'off'}
                        aria-label={`Semaine du ${DD(m)} ${MOISL[M(m) - 1]} ${Y(m)}${state === 'part' ? ` : congé ${c} jour${c > 1 ? 's' : ''} sur ${workDays.length}` : ''}`}
                        title={`Semaine du ${fmtDate(m)}${state === 'part' ? ` · ${c} jour${c > 1 ? 's' : ''} de congé sur ${workDays.length}` : ''}`}
                        onClick={() => toggle(m)}
                      >
                        {DD(m)}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
