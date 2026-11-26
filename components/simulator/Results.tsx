'use client';
import { Fragment, useState } from 'react';
import {
  MOISL, cpPaidText, eur, fmtDate, fmtPeriod, num, sgn,
  type MonthRow, type Params, type SimResult,
} from '@/lib/engine';

const Det = ({ children }: { children: React.ReactNode }) => <span className="det">{children}</span>;

/* ---------- Cartes de synthèse ---------- */
export function SummaryCards({ R }: { R: SimResult }) {
  const label = R.F === 'C' ? 'Année complète' : 'Année incomplète';
  const fin = R.iccp + R.reg + R.rupture;
  return (
    <div className="cards">
      <div className="card main">
        <span className="k">Salaire mensualisé · {label}</span>
        <span className="v">{eur(R.full)}</span>
        <span className="d">
          {R.phases.map((ph, i) => (
            <Fragment key={i}>
              {R.phases.length > 1 && (i === 0 ? `Jusqu'au ${fmtDate(R.phases[1].from - 1)} : ${eur(ph.full!)} · ` : `À partir du ${fmtDate(ph.from)} : `)}
              {`${num(ph.Hn)} h × ${R.weeks} sem. ÷ 12 × ${eur(ph.rate)}`}
              {ph.Hs > 0 && ` + ${num(ph.Hs)} h majorées par semaine, payées en plus chaque mois à ${eur(ph.rateS)}`}
              {i < R.phases.length - 1 && <br />}
            </Fragment>
          ))}
        </span>
      </div>
      <div className="card"><span className="k">Entretien et repas · par mois en moyenne</span><span className="v">{eur(R.ent / R.rows.length)}</span><span className="d">Selon les jours de garde réels</span></div>
      <div className="card">
        <span className="k">Fin de contrat · à verser en plus</span><span className="v">{eur(fin)}</span>
        <span className="d">Congés non pris {eur(R.iccp, false)}{R.F === 'I' && ` · régularisation ${eur(R.reg, false)}`} · rupture {eur(R.rupture, false)}</span>
      </div>
      <div className="card">
        <span className="k">Total net du contrat</span><span className="v">{eur(R.grand)}</span>
        <span className="d">Salaires, congés payés et fin de contrat · hors entretien</span>
      </div>
    </div>
  );
}

/* ---------- Tableau mois par mois ---------- */
function MiddleCell({ r, complete }: { r: MonthRow; complete: boolean }) {
  if (complete && r.ded > 0.005) return <><span className="neg">− {eur(r.ded)}</span><Det>{r.dedDet}</Det><Det>{r.unpaidTxt}</Det></>;
  if (r.cpPay > 0.005) return <><span className="pos">+ {eur(r.cpPay)}</span><Det>{complete ? '10 % plus favorable que le maintien' : r.cpTxt}</Det></>;
  return <>—</>;
}
function ExtraCell({ r }: { r: MonthRow }) {
  if (!r.extraLines.length) return <>—</>;
  return <>{r.extraPay > 0.005 ? `+ ${eur(r.extraPay)}` : '—'}{r.extraLines.map((t) => <Det key={t}>{t}</Det>)}</>;
}

export function MonthTable({ R, P }: { R: SimResult; P: Params }) {
  const C = R.F === 'C';
  const cls = C ? 'gc' : 'gi', tcls = C ? 'c' : 'i';
  const body: React.ReactNode[] = [];
  let cumAcq = 0, curP: number | null = null;
  let sub = { pay: 0, ent: 0, tot: 0 };
  const subRow = (p: number) => (
    <tr className="sub" key={`s${p}`}>
      <th colSpan={3}>Total {fmtPeriod(p, P.start, P.end)}</th>
      <td className="n" colSpan={4}>{num(cumAcq)} j{R.closed[p] ? ` → ${R.closed[p].days} j acquis` : ''}</td>
      <td colSpan={3}></td><td className="n">{eur(sub.pay)}</td><td className="n">{eur(sub.ent)}</td><td className="n">{eur(sub.tot)}</td>
    </tr>
  );
  R.rows.forEach((r, i) => {
    if (curP !== null && r.p !== curP) { body.push(subRow(curP)); sub = { pay: 0, ent: 0, tot: 0 }; cumAcq = 0; }
    curP = r.p; cumAcq += r.acq;
    const ent = r.ent + r.meal, tot = r.pay + ent;
    body.push(
      <tr key={r.m0}>
        <th>{MOISL[r.mo - 1]} {r.y}<span className="ph">{num(r.schedH)} h prévues</span></th>
        <td className="n">{r.gardeDays}</td>
        <td>{r.vacDays > 0 && <span className="ph">{r.vacDays} j</span>}</td>
        <td className="n">{num(r.acq)}</td><td className="n">{num(cumAcq)}</td><td className="n">{r.bankBefore ? num(r.bankBefore) : '0'}</td>
        <td className="n b">{r.pris ? `${r.pris} j` : '—'}</td>
        <td className="n">{eur(r.mens)}{r.partial && <Det>{r.mensDet}</Det>}</td>
        <td className="n"><ExtraCell r={r} /></td>
        <td className="n"><MiddleCell r={r} complete={C} /></td>
        <td className={`n b ${tcls}`}>{eur(r.pay)}</td>
        <td className="n">{eur(ent)}</td><td className="n">{eur(tot)}</td>
      </tr>,
    );
    sub.pay += r.pay; sub.ent += ent; sub.tot += tot;
  });
  if (curP !== null) body.push(subRow(curP));
  const endRow = (t: string, v: number) => (
    <tr className="end" key={t}>
      <th colSpan={10}>{t}</th><td className={`n b ${tcls}`}>{eur(v)}</td><td></td><td className="n">{eur(v)}</td>
    </tr>
  );
  body.push(endRow('Fin de contrat · congés payés non pris', R.iccp));
  if (R.F === 'I') body.push(endRow('Fin de contrat · régularisation des heures', R.reg));
  body.push(endRow('Fin de contrat · indemnité de rupture', R.rupture));
  const entTot = R.rows.reduce((a, r) => a + r.ent + r.meal, 0);
  body.push(
    <tr className="total" key="total">
      <th colSpan={10}>Total du contrat</th><td className="n">{eur(R.grand)}</td><td className="n">{eur(entTot)}</td><td className="n">{eur(R.grand + entTot)}</td>
    </tr>,
  );
  return (
    <div className="tablewrap">
      <table className="grid">
        <thead>
          <tr className="grp">
            <th colSpan={3}></th><th colSpan={4}>Congés payés · jours ouvrables</th>
            <th colSpan={4} className={cls}>{C ? 'Année complète' : 'Année incomplète'}</th><th colSpan={2}></th>
          </tr>
          <tr>
            <th>Mois</th><th className="n">Jours de garde</th><th>Congés</th><th className="n">Acquis</th><th className="n">Cumul</th><th className="n">Disponibles</th><th className="n">Pris</th>
            <th className={`n ${cls}`}>Salaire mensualisé</th><th className={`n ${cls}`}>Majorations</th>
            <th className={`n ${cls}`}>{C ? 'Retenue (jours de congés sans solde)' : 'Congés payés'}</th><th className={`n ${cls}`}>À verser</th>
            <th className="n">Entretien et repas</th><th className="n">Total du mois</th>
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}

/* ---------- Congés payés ---------- */
export function CpTable({ R, P }: { R: SimResult; P: Params }) {
  const C = R.F === 'C';
  const pc = R.rows.length ? R.rows[R.rows.length - 1].p : 0;
  return (
    <div className="tablewrap">
      <table className="grid">
        <thead><tr><th>Période d&apos;acquisition</th><th className="n">Semaines retenues</th><th className="n">Jours acquis</th><th className="n">Maintien de salaire</th><th className="n">10 % des salaires</th><th className="n">Montant retenu</th><th>{C ? 'Comment ils sont payés' : 'Versement'}</th></tr></thead>
        <tbody>
          {Object.values(R.closed).sort((a, b) => a.p - b.p).map((c) => (
            <tr key={c.p}>
              <th>{fmtPeriod(c.p, P.start, P.end)}</th><td className="n">{num(c.weeks)}</td><td className="n">{num((c.weeks * 2.5) / 4)} → {c.days} j</td>
              <td className="n">{eur(c.maint)}<Det>{c.days} ÷ 6 × {eur(c.weekVal)}</Det></td><td className="n">{eur(c.dix)}</td><td className="n b">{eur(c.value)}</td>
              <td>{C ? `Salaire maintenu pendant les congés, à partir du 1er juin ${c.p}` : `Versés : ${cpPaidText(R, c.p) || '—'}`}</td>
            </tr>
          ))}
          {R.cur && (
            <tr>
              <th>{fmtPeriod(pc, P.start, P.end)}</th><td className="n">{num(R.cur.weeks)}</td><td className="n">{num(R.cur.raw)} → {R.cur.days} j</td>
              <td className="n">{eur(R.cur.maint)}<Det>{R.cur.days} ÷ 6 × {eur(R.cur.weekVal)}</Det></td><td className="n">{eur(R.cur.dix)}</td><td className="n b">{eur(R.cur.value)}</td>
              <td>Indemnité de fin de contrat</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Fin de contrat ---------- */
export function EndOfContract({ R }: { R: SimResult }) {
  const pre = R.ancMonths < 3 ? '8 jours' : R.ancMonths < 12 ? '15 jours' : '1 mois';
  return (
    <div className="boxes">
      <div className="box">
        <h3>Congés payés non pris</h3>
        <table className="calc"><tbody>
          {R.iccpLines.map((l) => (
            <tr key={l.label}><td>{l.label}<Det>maintien {eur(l.maint, false)} · 10 % {eur(l.dix, false)}</Det></td><td className="n">{eur(l.value)}</td></tr>
          ))}
          <tr className="win"><td>Indemnité compensatrice</td><td className="n">{eur(R.iccp, false)}</td></tr>
        </tbody></table>
      </div>
      {R.F === 'I' && (
        <div className="box">
          <h3>Régularisation des heures</h3>
          <table className="calc"><tbody>
            {R.regLines.map((l, i) => (
              <tr key={i}>
                <td>
                  {R.regLines.length > 1 && `${l.ph.from === -Infinity ? 'Planning de départ' : 'Nouveau planning'} : `}
                  {num(l.due)} h dues − {num(l.paid)} h payées
                  <Det>× {eur(l.ph.rate)}{l.ph.Hs > 0 && ' (heures au-delà de 45 h déjà payées à part)'}</Det>
                </td>
                <td className="n">{sgn(l.value)}</td>
              </tr>
            ))}
            <tr className="win"><td>À verser</td><td className="n">{eur(R.reg, false)}</td></tr>
          </tbody></table>
          <p className="note">{R.regRaw < 0 ? "Elle a été payée pour plus d'heures qu'elle n'en a faites : rien n'est retenu." : 'Heures faites mais pas encore payées par le salaire lissé.'}</p>
        </div>
      )}
      <div className="box">
        <h3>Indemnité de rupture</h3>
        <table className="calc"><tbody>
          <tr><td>Ancienneté</td><td className="n">{R.ancMonths} mois</td></tr>
          <tr><td>Salaires nets du contrat</td><td className="n">{eur(R.salaires, false)}</td></tr>
          <tr><td>Estimation brute</td><td className="n">{eur(R.brut, false)}</td></tr>
          <tr className="win"><td>{R.ancMonths >= 9 ? '1/80 des salaires bruts' : "Pas d'indemnité (moins de 9 mois)"}</td><td className="n">{eur(R.rupture, false)}</td></tr>
        </tbody></table>
        <p className="note">Préavis : {pre}, à notifier par lettre recommandée avec accusé de réception.</p>
      </div>
    </div>
  );
}

/* ---------- Onglets ---------- */
export default function Results({ R, P, onPrint }: { R: SimResult; P: Params; onPrint: () => void }) {
  const [tab, setTab] = useState<'mois' | 'cp' | 'fin'>('mois');
  const tabs = [['mois', 'Mois par mois'], ['cp', 'Congés payés'], ['fin', 'Fin de contrat']] as const;
  return (
    <>
      <SummaryCards R={R} />
      <div className="tabbar">
      <div className="tabs" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" className="tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
        <button type="button" className="btn copper" onClick={onPrint}>Version imprimable</button>
      </div>
      <div className="panes">
        {tab === 'mois' && (
          <section>
            <MonthTable R={R} P={P} />
          </section>
        )}
        {tab === 'cp' && (
          <section>
            <p className="note">Les congés payés se gagnent dès le premier jour du contrat : 2,5 jours ouvrables par tranche de 4 semaines travaillées, jusqu&apos;à 30 jours. Le compteur s&apos;arrête chaque 31 mai et les jours se prennent à partir du 1er juin suivant. Leur montant est le plus favorable entre le maintien de salaire et 10 % des salaires de la période.</p>
            <CpTable R={R} P={P} />
          </section>
        )}
        {tab === 'fin' && <section><EndOfContract R={R} /></section>}
      </div>
    </>
  );
}
