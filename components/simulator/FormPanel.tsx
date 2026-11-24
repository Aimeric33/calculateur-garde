'use client';
import {
  FERIES, WEEKDAYS, eur, hm, slotHours, toN, toS, weekHours,
  type Analysis, type FormState, type Params, type WeekPlan,
} from '@/lib/engine';

type Patch = Partial<FormState>;
interface Props { s: FormState; set: (p: Patch) => void; P: Params; A: Analysis; onReset: () => void }

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

export default function FormPanel({ s, set, P, A, onReset }: Props) {
  const complete = s.vacWeeks <= 5;
  const H1 = weekHours(s.days), H2 = weekHours(s.chg.days);
  const Hmax = s.chg.on ? Math.max(H1, H2) : H1;
  const setChg = (p: Partial<FormState['chg']>) => set({ chg: { ...s.chg, ...p } });
  const setVac = (i: number, k: 0 | 1, v: string) => set({ vac: s.vac.map((x, j) => (j === i ? (k ? [x[0], v] : [v, x[1]]) : x)) as FormState['vac'] });
  const addVac = () => {
    const last = s.vac[s.vac.length - 1];
    const base = last ? toN(last[1]) + 7 : toN(s.start) + 30;
    set({ vac: [...s.vac, [toS(base), toS(base + 5)]] });
  };
  const toggleFer = (k: FormState['ferTrav'][number], on: boolean) =>
    set({ ferTrav: on ? [...s.ferTrav, k] : s.ferTrav.filter((x) => x !== k) });

  return (
    <form className="panel" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
      <div className="step">
        <div className="step-h"><span className="num">1</span><h2>Le contrat</h2></div>
        <div className="row2">
          <div className="field"><label htmlFor="start">Date de début</label><input type="date" id="start" value={s.start} onChange={(e) => set({ start: e.target.value })} /></div>
          <div className="field"><label htmlFor="end">Date de fin prévue</label><input type="date" id="end" value={s.end} onChange={(e) => set({ end: e.target.value })} /></div>
        </div>
        <div className="field">
          <label htmlFor="rate">Salaire horaire net</label>
          <NumberInput id="rate" value={s.rate} min={0} onChange={(v) => set({ rate: v })} suffix="€ / h" />
          <span className="hint">Minimum légal : 3,28 € net de l&apos;heure (4,20 € brut) au 1er juin 2026.</span>
        </div>
      </div>

      <div className="step">
        <div className="step-h"><span className="num">2</span><h2>Le planning de la semaine</h2></div>
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
        <label className="toggle"><input type="checkbox" id="chgOn" checked={s.chg.on} onChange={(e) => setChg({ on: e.target.checked })} /> Le planning change en cours de contrat (adaptation, passage à temps plein…)</label>
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

      <div className="step">
        <div className="step-h"><span className="num">3</span><h2>Les vacances</h2></div>
        <div className="field">
          <label htmlFor="vacWeeks">Semaines de vacances de l&apos;assistante maternelle par an</label>
          <NumberInput id="vacWeeks" value={s.vacWeeks} step={1} min={5} max={20} onChange={(v) => set({ vacWeeks: Math.max(5, Math.round(v) || 5) })} suffix="semaines" />
          <span className="hint">Congés payés compris (5 semaines). On suppose que vos vacances tombent en même temps que les siennes.</span>
        </div>
        <div className="typebox">
          {complete
            ? <><b>Année complète</b><span>52 semaines payées : elle ne prend que ses 5 semaines de congés payés.</span></>
            : <><b>Année incomplète · {P.weeksI} semaines d&apos;accueil</b><span>Plus de 5 semaines de vacances par an : le salaire est calculé sur {P.weeksI} semaines et les congés payés sont versés à part.</span></>}
        </div>
        <div className="field">
          <span className="lbl">Dates de ses vacances</span>
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
          <div className="chips">{A.chips.map((c) => <span key={c.label} className={`chip${c.bad ? ' bad' : ''}`}>{c.label}</span>)}</div>
        </div>
        {!complete && (
          <div className="field">
            <label htmlFor="cpMode">Paiement des congés payés</label>
            <select id="cpMode" value={s.cpMode} onChange={(e) => set({ cpMode: e.target.value as FormState['cpMode'] })}>
              <option value="juin">En une fois, avec le salaire de juin</option>
              <option value="principal">Au moment du congé principal (12 jours ou plus)</option>
              <option value="prise">À chaque prise de congés</option>
            </select>
            <span className="hint">En année incomplète, les congés payés s&apos;ajoutent au salaire selon la modalité inscrite au contrat.</span>
          </div>
        )}
        <details className="adv">
          <summary>Jours fériés travaillés</summary>
          <div className="field">
            <span className="hint">Par défaut, les jours fériés sont chômés et payés dans le salaire mensualisé. Cochez ceux où elle accueillera l&apos;enfant.</span>
            <div className="ferlist">
              {FERIES.map(([k, l]) => (
                <label key={k}><input type="checkbox" id={`fer_${k}`} checked={s.ferTrav.includes(k)} onChange={(e) => toggleFer(k, e.target.checked)} /> {l}</label>
              ))}
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="ferMaj">Majoration d&apos;un férié travaillé</label>
              <NumberInput id="ferMaj" value={s.ferMaj} step={1} min={10} onChange={(v) => set({ ferMaj: v })} suffix="%" />
              <span className="hint">Minimum 10 %. Le 1er mai travaillé est toujours majoré de 100 %.</span>
            </div>
            <div className="field">
              <label htmlFor="pent">Lundi de Pentecôte</label>
              <select id="pent" value={s.pent} onChange={(e) => set({ pent: e.target.value as FormState['pent'] })}>
                <option value="chome">Chômé et payé</option>
                <option value="solid">Journée de solidarité (travaillé, non majoré)</option>
                <option value="trav">Travaillé et majoré</option>
              </select>
            </div>
          </div>
        </details>
      </div>

      <div className="step">
        <div className="step-h"><span className="num">4</span><h2>Les indemnités</h2></div>
        <div className="row2">
          <div className="field"><label htmlFor="ent">Entretien</label><NumberInput id="ent" value={s.ent} min={0} onChange={(v) => set({ ent: v })} suffix="€ / jour" /></div>
          <div className="field"><label htmlFor="meal">Repas</label><NumberInput id="meal" value={s.meal} min={0} onChange={(v) => set({ meal: v })} suffix="€ / jour" /></div>
        </div>
        <span className="hint">Minimum légal pour une journée de {hm(A.maxDay)} : {eur(A.entMin)}. Repas : à indiquer seulement si vous ne les fournissez pas.</span>
        <details className="adv">
          <summary>Réglages avancés</summary>
          <div className="field">
            <label htmlFor="ratio">Rapport net / brut</label>
            <NumberInput id="ratio" value={s.ratio} min={50} max={100} onChange={(v) => set({ ratio: v })} suffix="%" />
            <span className="hint">Sert à estimer le brut pour l&apos;indemnité de rupture. Pajemploi donne le chiffre exact.</span>
          </div>
        </details>
        <div className="btns"><button type="button" className="btn" onClick={onReset}>Revenir à l&apos;exemple</button></div>
      </div>
    </form>
  );
}
