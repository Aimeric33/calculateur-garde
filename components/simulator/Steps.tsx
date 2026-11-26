'use client';
import {
  FERIES, WEEKDAYS, eur, hm, slotHours, toN, toS, weekHours,
  type Analysis, type FormState, type Params, type WeekPlan,
} from '@/lib/engine';
import WeekGrid from './WeekGrid';

type Patch = Partial<FormState>;
export interface StepProps { s: FormState; set: (p: Patch) => void; P: Params; A: Analysis }

/** Champ numérique contrôlé : vide → NaN, affiché vide. */
function NumberInput({ id, value, onChange, step = 0.01, min, max, suffix }: {
  id: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix: string;
}) {
  return (
    <div className="suffix">
      <input id={id} type="number" inputMode="decimal" step={step} min={min} max={max}
        value={Number.isFinite(value) ? value : ''} onChange={(e) => onChange(e.target.valueAsNumber)} />
      <span>{suffix}</span>
    </div>
  );
}

const weekLabel = (h: number) => (h > 45 ? `${hm(h)} dont ${hm(h - 45)} majorées` : hm(h));

function DayGrid({ prefix, days, onChange }: { prefix: string; days: WeekPlan; onChange: (d: WeekPlan) => void }) {
  const upd = (i: number, k: 0 | 1 | 2, v: boolean | string) => {
    const slot = [...days[i]] as WeekPlan[number];
    (slot as (boolean | string)[])[k] = v;
    onChange({ ...days, [i]: slot });
  };
  return (
    <div className="days">
      {WEEKDAYS.map(([i, name]) => {
        const d = days[i];
        return (
          <div key={i} className={`day${d[0] ? '' : ' off'}`}>
            <label><input type="checkbox" id={`${prefix}on${i}`} checked={d[0]} onChange={(e) => upd(i, 0, e.target.checked)} /> {name}</label>
            <input type="time" id={`${prefix}a${i}`} aria-label={`${name} : arrivée`} value={d[1]} disabled={!d[0]} onChange={(e) => upd(i, 1, e.target.value)} />
            <input type="time" id={`${prefix}b${i}`} aria-label={`${name} : départ`} value={d[2]} disabled={!d[0]} onChange={(e) => upd(i, 2, e.target.value)} />
            <span className="h">{d[0] ? hm(slotHours(d)) : '—'}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Étape 1 : le contrat ---------- */
function StepContrat({ s, set }: StepProps) {
  return (
    <>
      <div className="row2">
        <div className="field"><label htmlFor="start">Date de début</label><input type="date" id="start" value={s.start} onChange={(e) => set({ start: e.target.value })} /></div>
        <div className="field"><label htmlFor="end">Date de fin prévue</label><input type="date" id="end" value={s.end} onChange={(e) => set({ end: e.target.value })} /></div>
      </div>
      <div className="field">
        <label htmlFor="rate">Salaire horaire net</label>
        <NumberInput id="rate" value={s.rate} min={0} onChange={(v) => set({ rate: v })} suffix="€ / h" />
        <span className="hint">Minimum légal : 3,28 € net de l&apos;heure (4,20 € brut) au 1er juin 2026.</span>
      </div>
    </>
  );
}

/* ---------- Étape 2 : le planning ---------- */
function StepPlanning({ s, set }: StepProps) {
  const H1 = weekHours(s.days), H2 = weekHours(s.chg.days);
  const Hmax = s.chg.on ? Math.max(H1, H2) : H1;
  const setChg = (p: Partial<FormState['chg']>) => set({ chg: { ...s.chg, ...p } });
  return (
    <>
      {s.chg.on && <span className="lbl">Planning de départ</span>}
      <DayGrid prefix="" days={s.days} onChange={(d) => set({ days: d })} />
      <div className="tot"><span>Total par semaine</span><b>{weekLabel(H1)}</b></div>
      <div className="field">
        <label htmlFor="maj">Majoration des heures au-delà de 45 h</label>
        <NumberInput id="maj" value={s.maj} step={1} min={0} max={100} onChange={(v) => set({ maj: v })} suffix="%" />
        <span className="hint">
          {Hmax > 45
            ? `${hm(Hmax - 45)} par semaine au-delà de 45 h. Le salaire mensualisé couvre 45 h ; ces heures sont payées en plus chaque mois, selon les heures réellement faites, à ${eur(s.rate * (1 + (s.maj || 0) / 100))} de l'heure. Minimum : 10 %.`
            : 'Votre planning ne dépasse pas 45 h : aucune heure majorée.'}
        </span>
      </div>
      <div className={'opt' + (s.chg.on ? ' on' : '')}>
        <label className="opt-h">
          <input type="checkbox" role="switch" className="switch" id="chgOn" checked={s.chg.on} onChange={(e) => setChg({ on: e.target.checked })} />
          <span>
            <b>Les conditions changent en cours de contrat ?</b>
            <small>Changement d&apos;horaires ou des jours de garde, nouveau salaire horaire… Ajoutez un second planning avec sa date de début.</small>
          </span>
        </label>
      {s.chg.on && (
        <div className="chg">
          <div className="row2">
            <div className="field"><label htmlFor="chgDate">Nouveau planning à partir du</label><input type="date" id="chgDate" value={s.chg.date} onChange={(e) => setChg({ date: e.target.value })} /></div>
            <div className="field"><label htmlFor="rate2">Salaire horaire net</label><NumberInput id="rate2" value={s.chg.rate} min={0} onChange={(v) => setChg({ rate: v })} suffix="€ / h" /></div>
          </div>
          <span className="lbl">Nouveau planning</span>
          <DayGrid prefix="x" days={s.chg.days} onChange={(d) => setChg({ days: d })} />
          <div className="tot"><span>Total par semaine</span><b>{weekLabel(H2)}</b></div>
        </div>
      )}
      </div>
    </>
  );
}

/* ---------- Étape 3 : les congés ---------- */
function StepVacances({ s, set, P }: StepProps) {
  const complete = s.vacWeeks <= 5;
  const setVac = (i: number, k: 0 | 1, v: string) => set({ vac: s.vac.map((x, j) => (j === i ? (k ? [x[0], v] : [v, x[1]]) : x)) as FormState['vac'] });
  const addVac = () => {
    const last = s.vac[s.vac.length - 1];
    const base = last ? toN(last[1]) + 7 : toN(s.start) + 30;
    set({ vac: [...s.vac, [toS(base), toS(base + 5)]] });
  };
  // Jours fériés : nombre de jours travaillés et besoin d'un taux de majoration (le 1er mai est toujours payé double)
  const ferCount = s.ferTrav.length;
  const needsMaj = s.ferTrav.some((k) => k !== 'mai1');
  const toggleFer = (k: FormState['ferTrav'][number], on: boolean) =>
    set({ ferTrav: on ? [...s.ferTrav, k] : s.ferTrav.filter((x) => x !== k) });
  return (
    <>
      <div className="field">
        <label htmlFor="vacWeeks">Semaines de congés de l&apos;assistante maternelle par an</label>
        <NumberInput id="vacWeeks" value={s.vacWeeks} step={1} min={5} max={20} onChange={(v) => set({ vacWeeks: Math.max(5, Math.round(v) || 5) })} suffix="semaines" />
        <span className="hint">Congés payés compris (5 semaines). On suppose que vos congés tombent en même temps que les siens.</span>
      </div>
      <div className="typebox">
        {complete
          ? <><b>Année complète</b><span>52 semaines payées : elle ne prend que ses 5 semaines de congés payés.</span></>
          : <><b>Année incomplète · {P.weeksI} semaines d&apos;accueil</b><span>Plus de 5 semaines de congés par an : le salaire est calculé sur {P.weeksI} semaines et les congés payés sont versés à part.</span></>}
      </div>
      <div className="field">
        <span className="lbl">Ses semaines de congé</span>
        <span className="hint">Cliquez sur chaque semaine où votre enfant n&apos;est pas accueilli ; un second clic l&apos;annule.</span>
        <WeekGrid s={s} set={set} start={P.start} end={P.end} />
        <div className="legend wg-legend"><span>Accueil</span><span className="v">Congé</span><span className="p">Congé sur une partie de la semaine</span></div>
      </div>
      <details className="opt adj">
        <summary className="opt-h">
          <span className="chev" aria-hidden="true"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <span>
            <b>Ajuster au jour près</b>
            <small>Un congé de quelques jours seulement ? Modifiez les dates exactes de chaque période. Elles sont reliées à la grille ci-dessus.</small>
          </span>
        </summary>
        <div className="field adj-body">
          <div className="vac">
            {s.vac.length === 0 && <span className="hint">Aucune période saisie.</span>}
            {s.vac.map((v, i) => (
              <div className="vacrow" key={i}>
                <input type="date" id={`va${i}`} aria-label={`Période ${i + 1} : début`} value={v[0]} onChange={(e) => setVac(i, 0, e.target.value)} />
                <input type="date" id={`vb${i}`} aria-label={`Période ${i + 1} : fin`} value={v[1]} onChange={(e) => setVac(i, 1, e.target.value)} />
                <button type="button" className="btn icon" aria-label={`Supprimer la période ${i + 1}`} onClick={() => set({ vac: s.vac.filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
          </div>
          <div className="btns"><button type="button" className="btn" onClick={addVac}>Ajouter une période</button></div>
        </div>
      </details>
      <details className="opt">
        <summary className="opt-h">
          <span className="chev" aria-hidden="true"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <span>
            <b>Jours fériés travaillés</b>
            <small>Par défaut, ils sont chômés et payés dans le salaire. Indiquez ceux où votre enfant sera accueilli.</small>
          </span>
          <span className={'opt-badge' + (ferCount ? ' on' : '')}>{ferCount ? `${ferCount} travaillé${ferCount > 1 ? 's' : ''}` : 'Aucun'}</span>
        </summary>
        <div className="adj-body fer-body">
          <div className="field">
            <span className="lbl" id="fer-lbl">Jours fériés où votre enfant est accueilli</span>
            <div className="fer-chips" role="group" aria-labelledby="fer-lbl">
              {FERIES.map(([k, l]) => (
                <button key={k} type="button" className="fchip" aria-pressed={s.ferTrav.includes(k)} onClick={() => toggleFer(k, !s.ferTrav.includes(k))}>
                  {l}{k === 'mai1' && <em>payé double</em>}
                </button>
              ))}
            </div>
          </div>
          {needsMaj && (
            <div className="field fer-maj">
              <label htmlFor="ferMaj">Majoration des jours fériés travaillés</label>
              <NumberInput id="ferMaj" value={s.ferMaj} step={1} min={10} onChange={(v) => set({ ferMaj: v })} suffix="%" />
              <span className="hint">Minimum 10 %. Le 1er mai travaillé est toujours payé double (+ 100 %).</span>
            </div>
          )}
        </div>
      </details>
      {!complete && (
        <fieldset className="field">
          <legend className="lbl">Paiement des congés payés</legend>
          <span className="hint">En année incomplète, les congés payés s&apos;ajoutent au salaire. Choisissez la modalité inscrite au contrat.</span>
          <div className="choices">
            {([
              ['juin', 'En une fois en juin', 'Avec le salaire de juin, pour toute l’année écoulée'],
              ['principal', 'Avec le congé principal', 'Au moment du congé principal (12 jours ou plus)'],
              ['prise', 'À chaque congé', 'Au fur et à mesure des congés pris'],
            ] as const).map(([v, t, d]) => (
              <label key={v}>
                <input type="radio" name="cpMode" value={v} checked={s.cpMode === v} onChange={() => set({ cpMode: v })} />
                <b>{t}</b><small>{d}</small>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </>
  );
}

/* ---------- Étape 4 : les indemnités ---------- */
function StepIndemnites({ s, set, A }: StepProps) {
  return (
    <>
      <div className="row2">
        <div className="field"><label htmlFor="ent">Entretien</label><NumberInput id="ent" value={s.ent} min={0} onChange={(v) => set({ ent: v })} suffix="€ / jour" /></div>
        <div className="field"><label htmlFor="meal">Repas</label><NumberInput id="meal" value={s.meal} min={0} onChange={(v) => set({ meal: v })} suffix="€ / jour" /></div>
      </div>
      <span className="hint">Minimum légal pour une journée de {hm(A.maxDay)} : {eur(A.entMin)}. Repas : à indiquer seulement si vous ne les fournissez pas.</span>
    </>
  );
}

export const STEPS = [
  { t: 'Le contrat', intro: 'Les dates du contrat et le salaire horaire net qui y est inscrit.', C: StepContrat },
  { t: 'Le planning', intro: "Les horaires d'accueil d'une semaine type. Si les horaires changent en cours de contrat, ajoutez un second planning.", C: StepPlanning },
  { t: 'Les congés', intro: "Les semaines où votre enfant n'est pas accueilli : c'est ce qui détermine le type de contrat.", C: StepVacances },
  { t: 'Les indemnités', intro: "Les indemnités versées en plus du salaire, pour chaque jour d'accueil.", C: StepIndemnites },
] as const;

/** Erreur qui empêche de passer l'étape `k` (null si tout va bien). */
export function stepError(k: number, s: FormState, P: Params): string | null {
  if (k === 0) {
    if (isNaN(P.start) || isNaN(P.end)) return 'Indiquez les dates de début et de fin du contrat.';
    if (P.end <= P.start) return 'La date de fin doit être après la date de début.';
    if (!(s.rate > 0)) return 'Indiquez le salaire horaire net.';
  }
  if (k === 1 && P.phases.some((ph) => !ph.H)) return `Cochez au moins un jour de garde avec ses horaires${s.chg.on ? ' dans chaque planning' : ''}.`;
  if (k === 2 && !(s.vacWeeks >= 5)) return 'Indiquez le nombre de semaines de congés par an.';
  return null;
}
