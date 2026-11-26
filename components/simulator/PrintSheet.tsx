import { Fragment } from 'react';
import {
  MOIS, MOISL, WEEKDAYS, cpPaidText, eur, fmtDate, fmtPeriod, num, sgn,
  type FormState, type Params, type SimResult, type WeekPlan,
} from '@/lib/engine';

const Det = ({ children }: { children: React.ReactNode }) => <span className="det">{children}</span>;

const planText = (plan: number[], days: WeekPlan) =>
  WEEKDAYS.filter(([d]) => plan[d] > 0)
    .map(([d, n]) => `${n.slice(0, 3).toLowerCase()}. ${days[d][1].replace(':', 'h')}–${days[d][2].replace(':', 'h')}`)
    .join(' · ');

/** Feuille A4 paysage : paramètres, mois par mois, congés payés et fin de contrat (formule choisie). */
export default function PrintSheet({ s, P, R }: { s: FormState; P: Params; R: SimResult }) {
  const C = R.F === 'C', k = C ? 'pc' : 'pi';
  const pc = R.rows[R.rows.length - 1].p;
  const rows: React.ReactNode[] = [];
  let cumAcq = 0, curP: number | null = null, sub = { H: 0, S: 0, E: 0 };
  const subRow = (p: number) => (
    <tr className="sub" key={`s${p}`}>
      <td colSpan={2}>Total {fmtPeriod(p, P.start, P.end)}</td><td className="n">{eur(sub.H)}</td><td></td>
      <td className="n" colSpan={4}>{num(cumAcq)} j{R.closed[p] ? ` → ${R.closed[p].days} j acquis` : R.cur ? ` → ${R.cur.days} j acquis` : ''}</td>
      <td className={`n ${k}`} colSpan={4}>{eur(sub.S)}</td><td className="n">{eur(sub.E)}</td><td className="n">{eur(sub.S + sub.E)}</td>
    </tr>
  );
  for (const c of R.rows) {
    if (curP !== null && c.p !== curP) { rows.push(subRow(curP)); sub = { H: 0, S: 0, E: 0 }; cumAcq = 0; }
    curP = c.p; cumAcq += c.acq;
    const ent = c.ent + c.meal;
    let mid: React.ReactNode = '—';
    if (c.ded > 0.005) mid = <>− {eur(c.ded)}<Det>{c.dedDet}</Det><Det>{c.unpaidTxt}</Det></>;
    else if (c.cpPay > 0.005) mid = <>+ {eur(c.cpPay)}<Det>{C ? 'complément 10 %' : c.cpTxt}</Det></>;
    rows.push(
      <tr key={c.m0}>
        <th>{MOISL[c.mo - 1]} {c.y}<span className="ph">{num(c.schedH)} h prévues</span></th>
        <td className="n">{c.gardeDays}</td>
        <td className="n">{eur(c.workedVal)}<Det>{num(c.workedH)} h × {c.rateTxt}</Det></td>
        <td className="v">{c.vacDays ? `${num(c.vacDays / c.dpw, 1)} sem.` : ''}</td>
        <td className="n">{num(c.acq)}</td><td className="n">{num(cumAcq)}</td><td className="n">{c.bankBefore ? num(c.bankBefore) : '0'}</td><td className="n b">{c.pris ? `${c.pris} j` : '—'}</td>
        <td className="n">{eur(c.mens)}{c.partial && <Det>{c.mensDet}</Det>}</td>
        <td className="n">{c.extraLines.length ? <>{c.extraPay > 0.005 ? `+ ${eur(c.extraPay)}` : '—'}{c.extraLines.map((t) => <Det key={t}>{t}</Det>)}</> : '—'}</td>
        <td className="n">{mid}</td><td className={`n b ${k}`}>{eur(c.pay)}</td><td className="n">{eur(ent)}</td><td className="n">{eur(c.pay + ent)}</td>
      </tr>,
    );
    sub.H += c.workedVal; sub.S += c.pay; sub.E += ent;
  }
  if (curP !== null) rows.push(subRow(curP));
  const endRow = (t: string, v: number) => (
    <tr key={t}><th colSpan={8}>{t}</th><td colSpan={3}></td><td className={`n b ${k}`}>{eur(v)}</td><td></td><td className="n">{eur(v)}</td></tr>
  );
  const entTot = R.rows.reduce((a, x) => a + x.ent + x.meal, 0);
  const prisTxt = (p: number) => R.rows.filter((x) => x.pris && x.p === p + 1).map((x) => `${MOIS[x.mo - 1]} ${x.y} : ${x.pris} j`).join(' · ');

  return (
    <div className="sheet">
      <h1>Simulation du contrat d&apos;accueil · {C ? 'année complète' : 'année incomplète'}</h1>
      <div className="params">
        <div><b>Début</b>{fmtDate(P.start)}</div><div><b>Fin</b>{fmtDate(P.end)}</div>
        <div><b>Type de contrat</b>{C ? 'Année complète (52 semaines)' : `Année incomplète (${P.weeksI} semaines)`}</div><div><b>Montants</b>nets</div>
        {R.phases.map((ph, i) => {
          const when = R.phases.length < 2 ? 'Planning' : i === 0 ? `Planning jusqu'au ${fmtDate(R.phases[1].from - 1)}` : `Planning à partir du ${fmtDate(ph.from)}`;
          return (
            <Fragment key={i}>
              <div style={{ gridColumn: 'span 2' }}><b>{when}</b>{planText(ph.plan, i === 0 ? s.days : s.chg.days)}</div>
              <div><b>Heures · taux</b>{num(ph.H)} h/sem.{ph.Hs > 0 && ` dont ${num(ph.Hs)} h majorées de ${num(P.maj)} %`} · {eur(ph.rate)} net{ph.Hs > 0 && ` (${eur(ph.rateS)} au-delà de 45 h)`}</div>
              <div><b>Salaire mensualisé{ph.Hs > 0 && ' (45 h)'}</b>{eur(ph.full!)}{ph.Hs > 0 && ' + heures majorées au réel'}</div>
            </Fragment>
          );
        })}
        <div><b>Congés</b>{s.vacWeeks} sem./an dont 5 de congés payés</div>
        <div><b>Entretien</b>{eur(P.ent)} / jour{P.meal > 0 && ` · repas ${eur(P.meal)} / jour`}</div>
      </div>

      <h2>Mois par mois</h2>
      <table>
        <thead>
          <tr className="grp"><th colSpan={4}></th><th colSpan={4}>Congés payés · jours ouvrables</th><th colSpan={4} className={k}>Salaire</th><th colSpan={2}></th></tr>
          <tr>
            <th>Mois</th><th className="n">Jours de garde</th><th className="n">Heures faites × taux</th><th>Congés</th>
            <th className="n">Acquis</th><th className="n">Cumul</th><th className="n">Disponibles</th><th className="n">Pris</th>
            <th className={`n ${k}`}>Salaire mensualisé</th><th className={`n ${k}`}>Majorations</th>
            <th className={`n ${k}`}>{C ? 'Retenue (jours de congés sans solde)' : 'Congés payés'}</th><th className={`n ${k}`}>À verser</th>
            <th className="n">Entretien et repas</th><th className="n">Total du mois</th>
          </tr>
        </thead>
        <tbody>
          {rows}
          {endRow('Fin de contrat · indemnité compensatrice de congés payés', R.iccp)}
          {!C && endRow('Fin de contrat · régularisation des heures', R.reg)}
          {endRow('Fin de contrat · indemnité de rupture', R.rupture)}
          <tr className="total"><th colSpan={8}>Total du contrat · {fmtDate(P.start)} → {fmtDate(P.end)}</th><td colSpan={3}></td><td className={`n ${k}`}>{eur(R.grand)}</td><td className="n">{eur(entTot)}</td><td className="n">{eur(R.grand + entTot)}</td></tr>
        </tbody>
      </table>

      <div className="keep">
        <h2>Calcul des congés payés</h2>
        <table>
          <thead><tr><th>Période d&apos;acquisition</th><th className="n">Semaines</th><th className="n">Jours acquis</th><th className="n">Maintien de salaire</th><th className="n">10 % des salaires</th><th className={`n ${k}`}>Montant retenu</th><th>{C ? 'Jours pris (salaire maintenu)' : 'Versement'}</th></tr></thead>
          <tbody>
            {Object.values(R.closed).sort((a, b) => a.p - b.p).map((c) => {
              const taken = prisTxt(c.p);
              const left = c.days - R.rows.filter((x) => x.p === c.p + 1).reduce((a, x) => a + x.pris, 0);
              const how = C ? `${taken}${left > 0 ? `${taken ? ' · ' : ''}${left} j non pris (indemnité)` : ''}` : `versés : ${cpPaidText(R, c.p) || '—'} · pris : ${taken || '—'}`;
              return (
                <tr key={c.p}>
                  <th>{fmtPeriod(c.p, P.start, P.end)}</th><td className="n">{num(c.weeks)}</td><td className="n">{num((c.weeks * 2.5) / 4)} → {c.days} j</td>
                  <td className="n">{eur(c.maint)}<Det>{c.days} ÷ 6 × {eur(c.weekVal)}</Det></td><td className="n">{eur(c.dix)}</td><td className={`n b ${k}`}>{eur(c.value)}</td><td className="v">{how}</td>
                </tr>
              );
            })}
            {R.cur && (
              <tr>
                <th>{fmtPeriod(pc, P.start, P.end)}</th><td className="n">{num(R.cur.weeks)}</td><td className="n">{num(R.cur.raw)} → {R.cur.days} j</td>
                <td className="n">{eur(R.cur.maint)}<Det>{R.cur.days} ÷ 6 × {eur(R.cur.weekVal)}</Det></td><td className="n">{eur(R.cur.dix)}</td><td className={`n b ${k}`}>{eur(R.cur.value)}</td>
                <td className="v">{R.cur.days} j non pris (indemnité de fin de contrat)</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="keep">
        <h2>Fin de contrat au {fmtDate(P.end)}</h2>
        <div className="pgrid">
          <table className="pcalc">
            <caption>Indemnité compensatrice de congés payés</caption>
            <tbody>
              {R.iccpLines.map((l) => <tr key={l.label}><th>{l.label}<Det>maintien {eur(l.maint, false)} · 10 % {eur(l.dix, false)}</Det></th><td className="n">{eur(l.value)}</td></tr>)}
              <tr className="tot"><th>Total</th><td className={`n ${k}`}>{eur(R.iccp, false)}</td></tr>
            </tbody>
          </table>
          {!C && (
            <table className="pcalc">
              <caption>Régularisation des heures</caption>
              <thead><tr><th></th><th className="n">Heures</th><th className="n">Montant</th></tr></thead>
              <tbody>
                {R.regLines.map((l, i) => (
                  <tr key={i}>
                    <th>{R.regLines.length > 1 ? (l.ph.from === -Infinity ? 'Planning de départ' : 'Nouveau planning') : 'Heures dues − heures payées'}<Det>{num(l.due)} h dues (gardées + fériés, 45 h/sem. au plus) − {num(l.paid)} h payées · × {eur(l.ph.rate)}</Det></th>
                    <td className="n">{l.due - l.paid >= 0 ? '+ ' : '− '}{num(Math.abs(l.due - l.paid))} h</td><td className="n">{sgn(l.value)}</td>
                  </tr>
                ))}
                <tr className="tot"><th>À verser</th><td></td><td className={`n ${k}`}>{eur(R.reg, false)}</td></tr>
              </tbody>
            </table>
          )}
          <table className="pcalc">
            <caption>Indemnité de rupture · 1/80 des salaires bruts</caption>
            <tbody>
              <tr><th>Ancienneté</th><td className="n">{R.ancMonths} mois</td></tr>
              <tr><th>Salaires nets du contrat</th><td className="n">{eur(R.salaires, false)}</td></tr>
              <tr><th>Salaires bruts estimés (÷ {num(P.ratio)} %)</th><td className="n">{eur(R.brut, false)}</td></tr>
              <tr className="tot"><th>{R.ancMonths >= 9 ? 'Indemnité' : "Pas d'indemnité (moins de 9 mois)"}</th><td className={`n ${k}`}>{eur(R.rupture, false)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
