import Link from 'next/link';
import {
  DD, EXAMPLE, M, MOIS, MOISL, WEEKDAYS, Y, buildParams, dayOf, eur, fmtDate, num, simulate, slotHours, wd,
} from '@/lib/engine';
import HowItWorks, { type HowStep } from '@/components/home/HowItWorks';
import Bento from '@/components/home/Bento';
import Faq from '@/components/home/Faq';
import Odometer from '@/components/home/Odometer';

// Délai d'animation propre à chaque élément (index utilisé par le CSS)
const d = (i: number) => ({ '--d': i }) as React.CSSProperties;

// Tous les chiffres de la page sont calculés au build avec le même moteur que le simulateur.
const P = buildParams(EXAMPLE);
const R = simulate(P, 'I');
// Année affichée : la première année civile complète du contrat d'exemple
const YR = Y(P.start) + 1;
const year = R.rows.filter((r) => r.y === YR);
const juin = year.find((r) => r.mo === 6)!;
const maxPay = Math.max(...year.map((r) => r.pay));
const yearTotal = year.reduce((a, r) => a + r.pay, 0);
const cp = R.closed[YR]; // période de référence juin YR-1 → mai YR
const fin = R.iccp + R.reg + R.rupture;
const shortDate = (n: number) => `${DD(n)} ${MOIS[M(n) - 1]}`;
const hhmm = (t: string) => t.replace(':', 'h');

// Semaines de l'année affichée (à partir de son premier lundi) : accueil ou congés
const jan1 = dayOf(YR, 1, 1);
const monday0 = jan1 + ((8 - wd(jan1)) % 7);
const weeks = Array.from({ length: 52 }, (_, i) => {
  const day = monday0 + 7 * i;
  return P.vac.some((v) => day >= v.a && day <= v.b);
});

// Planning de l'exemple, positionné sur une journée de 7 h à 19 h
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const plan = WEEKDAYS.filter(([i]) => EXAMPLE.days[i][0]).map(([i, label]) => {
  const [, a, b] = EXAMPLE.days[i];
  return { label: label.slice(0, 3) + '.', a, b, h: slotHours(EXAMPLE.days[i]), l: ((toMin(a) - 420) / 720) * 100, w: ((toMin(b) - toMin(a)) / 720) * 100 };
});

const STEPS: HowStep[] = [
  {
    t: 'Le contrat',
    d: 'Dates de début et de fin, salaire horaire net et taux de majoration. Les valeurs déjà remplies sont un exemple à modifier.',
    panel: {
      title: 'Le contrat', tag: 'Étape 1',
      rows: [
        { k: 'Début du contrat', v: fmtDate(P.start) },
        { k: 'Fin du contrat', v: fmtDate(P.end) },
        { k: 'Salaire horaire net', v: eur(EXAMPLE.rate) },
        { k: 'Heures au-delà de 45 h', v: `+ ${EXAMPLE.maj} %` },
      ],
      foot: 'Vos paramètres restent dans votre navigateur.',
    },
  },
  {
    t: 'Le planning',
    d: 'Les horaires jour par jour. Si les horaires changent en cours de contrat, ajoutez un second planning avec sa date.',
    panel: {
      title: 'Le planning de la semaine', tag: 'Étape 2',
      rows: plan.map((p) => ({ k: p.label, v: `${hhmm(p.a)} – ${hhmm(p.b)}`, tag: `${num(p.h)} h` })),
      foot: `Total : ${num(R.H)} h par semaine`,
    },
  },
  {
    t: 'Les congés',
    d: 'Le nombre de semaines sans accueil par an et leurs dates. Le type de contrat, année complète ou incomplète, en est déduit.',
    panel: {
      title: `Les congés en ${YR}`, tag: 'Étape 3',
      rows: P.vac.filter((v) => Y(v.a) === YR).slice(0, 5).map((v) => ({
        k: `${shortDate(v.a)} → ${shortDate(v.b)}`, v: '', tag: `${Math.ceil((v.b - v.a + 1) / 7)} sem.`,
      })),
      foot: `${EXAMPLE.vacWeeks} semaines par an → année incomplète, ${R.weeks} semaines d'accueil`,
    },
  },
  {
    t: 'Le résultat',
    d: 'Le salaire mois par mois, le détail des congés payés et de la fin de contrat, et une version à imprimer ou enregistrer en PDF.',
    panel: {
      title: 'Mois par mois', tag: 'Étape 4',
      rows: year.slice(0, 6).map((r) => ({ k: `${MOIS[r.mo - 1]} ${r.y}`, v: eur(r.pay), tag: r.cpPay > 0 ? 'congés payés' : undefined })),
      foot: `Total net sur ${R.rows.length} mois : ${eur(R.grand)}`,
    },
  },
];

const FAQ = [
  {
    q: 'Année complète ou année incomplète : comment savoir ?',
    a: "Tout dépend des semaines où votre enfant n'est pas accueilli. Si vos congés ne dépassent pas les 5 semaines de congés payés de l'assistante maternelle, c'est une année complète : le salaire est mensualisé sur 52 semaines. Au-delà, c'est une année incomplète : il est calculé sur les seules semaines d'accueil. Le simulateur le déduit du nombre de semaines de congés que vous indiquez.",
  },
  {
    q: 'Comment sont payés les congés payés en année incomplète ?',
    a: "Ils s'ajoutent au salaire mensualisé. Selon le contrat, ils sont versés en une fois en juin, lors de la prise principale des congés, ou au fur et à mesure de leur prise. Le simulateur compare le maintien de salaire et la règle des 10 % et retient le montant le plus favorable.",
  },
  {
    q: 'Que se passe-t-il si les horaires changent en cours de contrat ?',
    a: "Saisissez un second planning avec sa date d'application et, si besoin, un nouveau salaire horaire. Le salaire mensualisé est recalculé à partir de cette date et la régularisation de fin de contrat en tient compte.",
  },
  {
    q: 'Les heures au-delà de 45 heures par semaine sont-elles comptées ?',
    a: 'Oui. Elles sont majorées (10 % dans l’exemple, taux modifiable) et payées chaque mois en plus du salaire mensualisé, selon les heures réellement faites.',
  },
  {
    q: 'Le simulateur calcule-t-il les cotisations et le CMG ?',
    a: "Non. Il calcule les montants nets à verser à l'assistante maternelle : salaire, congés payés, indemnités d'entretien et de repas, fin de contrat. Les cotisations et le complément de libre choix du mode de garde sont gérés par Pajemploi et la CAF.",
  },
  {
    q: 'Mes informations sont-elles enregistrées ?',
    a: "Non. Tout est calculé dans votre navigateur et rien n'est envoyé sur un serveur. Vos paramètres sont simplement gardés en mémoire dans le navigateur pour vous éviter de tout ressaisir.",
  },
  {
    q: 'Les résultats ont-ils une valeur officielle ?',
    a: 'Non, ils sont indicatifs. Les calculs suivent la convention collective des particuliers employeurs (IDCC 3239). Pour un cas particulier, demandez confirmation au Relais Petite Enfance ou à Pajemploi.',
  },
];

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};

export default function Home() {
  return (
    <>
      {/* Héros */}
      <section className="hero">
        <div className="shell">
          <div className="hero-copy">
            <span className="eyebrow">Simulateur gratuit · convention IDCC 3239</span>
            <h1>Le salaire de votre assistante maternelle, <em>calculé mois par mois.</em></h1>
            <p className="lead">Entrez le contrat, le planning et les congés. Salaire mensualisé, congés payés et fin de contrat sont calculés et expliqués, ligne par ligne.</p>
            <div className="ctas">
              <Link href="/simulateur/" className="btn primary big">Faire une simulation</Link>
              <a href="#fonctionnement" className="btn big">Comment ça marche</a>
            </div>
            <ul className="hero-meta">
              <li>Sans inscription</li>
              <li>Données gardées dans votre navigateur</li>
            </ul>
          </div>

          <div className="visual">
            <div className="visual-bg">
              <div className="chart" aria-label={`Salaire net versé chaque mois en ${YR} : ${eur(R.full)} par mois, et ${eur(juin.pay)} en juin avec les congés payés.`} role="img">
                <div className="chart-h">
                  <div><span>Salaire net versé en {YR}</span><b><Odometer value={eur(yearTotal)} delay={0.35} /></b></div>
                  <ul className="chart-legend">
                    <li>Salaire mensualisé</li>
                    <li className="cp">Congés payés</li>
                  </ul>
                </div>
                <div className="cols">
                  {year.map((r, i) => (
                    <div
                      key={r.mo}
                      className={'col' + (r.cpPay > 0 ? ' has-cp' : '')}
                      data-tip={`${MOISL[r.mo - 1].replace(/^./, (c) => c.toUpperCase())} : ${eur(r.pay)}`}
                      style={{ ...d(i), '--h': `${(r.pay / maxPay) * 100}%` } as React.CSSProperties}
                    >
                      {r.cpPay > 0 && <i className="cp" style={{ height: `${(r.cpPay / maxPay) * 100}%` }} />}
                      <i style={{ height: `${((r.pay - r.cpPay) / maxPay) * 100}%` }} />
                    </div>
                  ))}
                  <span className="ref" style={{ bottom: `${(R.full / maxPay) * 100}%` }}><b>{eur(R.full)} / mois</b></span>
                  <span className="cp-tag" style={{ left: `${(5.5 / 12) * 100}%` }}>Juin : + {eur(juin.cpPay)}<small>de congés payés</small></span>
                </div>
                <div className="months">{year.map((r) => <span key={r.mo} className={r.cpPay > 0 ? 'hl' : undefined}>{MOIS[r.mo - 1].slice(0, 1).toUpperCase()}</span>)}</div>
              </div>
            </div>
            <div className="slip" aria-label="Exemple de résultat">
              <div className="slip-h"><b>Exemple de contrat</b><span className="tag">Année incomplète · {R.weeks} sem.</span></div>
              <dl>
                <dt>Planning</dt><dd>{num(R.H)} h / semaine</dd>
                <dt>Salaire mensualisé</dt><dd>{eur(R.full)}</dd>
                <dt>Congés payés, versés en juin {YR}</dt><dd>+ {eur(juin.cpPay)}</dd>
                <dt>Fin de contrat</dt><dd>{eur(fin)}</dd>
                <dt className="sum">Total net sur {R.rows.length} mois</dt><dd className="sum">{eur(R.grand)}</dd>
              </dl>
              <p className="note">Calculé avec les valeurs d&apos;exemple du simulateur.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="sec" id="calcul">
        <div className="shell">
          <div className="sec-head">
            <span className="eyebrow">Ce qui est calculé</span>
            <h2>Tout le contrat, <em>calculé et expliqué.</em></h2>
            <p>Chaque montant est accompagné de son calcul : vous voyez d&apos;où vient le chiffre avant de le déclarer.</p>
          </div>
          <Bento>
            <article className="fcard">
              <h3>Année complète ou incomplète</h3>
              <p>Le type de contrat est déduit des semaines de congés. Le salaire est mensualisé sur 52 semaines ou sur les semaines d&apos;accueil.</p>
              <div className="demo" aria-hidden="true">
                <div className="demo-h">Année {YR}<span className="tag">Année incomplète</span></div>
                <div className="weeks">{weeks.map((v, i) => <i key={i} className={v ? "v" : undefined} style={d(i)} />)}</div>
                <div className="legend"><span>Accueil · {R.weeks} sem.</span><span className="v">Congés · {EXAMPLE.vacWeeks} sem.</span></div>
                <div className="formula">{num(R.H)} h × {R.weeks} sem. ÷ 12 × {eur(EXAMPLE.rate)} = <b>{eur(R.full)} par mois</b></div>
              </div>
            </article>

            <article className="fcard">
              <h3>Congés payés</h3>
              <p>Jours acquis mois par mois, maintien de salaire ou 10 %, et trois façons de les payer en année incomplète.</p>
              {cp && (
                <div className="demo" aria-hidden="true">
                  <div className="demo-h">Période juin {YR - 1} – mai {YR}<span className="tag n">Versés en juin {YR}</span></div>
                  <div className={'cmp ' + (cp.maint >= cp.dix ? 'tip-l' : 'tip-r')}>
                    <div className={cp.maint >= cp.dix ? 'win' : undefined}><span>Maintien de salaire</span><b>{eur(cp.maint)}</b></div>
                    <div className={cp.dix > cp.maint ? 'win' : undefined}><span>Règle des 10 %</span><b>{eur(cp.dix)}</b></div>
                  </div>
                  <div className="formula">Le plus favorable est retenu : <b>{eur(cp.value)}</b></div>
                </div>
              )}
            </article>

            <article className="fcard">
              <h3>Heures majorées et jours fériés</h3>
              <p>Heures au-delà de 45 h payées chaque mois au réel, jours fériés travaillés majorés, 1er mai payé double.</p>
              <div className="demo" aria-hidden="true">
                <div className="plan" data-scan>
                  {plan.map((p, i) => (
                    <div key={p.label} data-scan-row data-l={p.l} data-w={p.w} style={{ ...d(i), '--l': p.l, '--w': p.w } as React.CSSProperties}>
                      <span>{p.label}</span>
                      <span className="track"><i style={{ left: `${p.l}%`, width: `${p.w}%` }} /></span>
                      <span data-odometer-element data-value={`${num(p.h)} h`}>{`${num(p.h)} h`}</span>
                    </div>
                  ))}
                </div>
                <div className="formula">Semaine : <b>{num(R.H)} h</b> · majoration au-delà de 45 h</div>
              </div>
            </article>

            <article className="fcard">
              <h3>Fin de contrat</h3>
              <p>Congés non pris, régularisation des heures en année incomplète, indemnité de rupture et préavis.</p>
              <div className="demo" aria-hidden="true">
                <div className="demo-h">Fin au {fmtDate(P.end)}<span className="tag g">À verser en plus</span></div>
                <ul className="lines" data-odometer-group>
                  <li style={d(0)}><span className="k"><i className="c">CP</i>Congés non pris</span><span className="v" data-odometer-element data-value={eur(R.iccp)}>{eur(R.iccp)}</span></li>
                  <li style={d(1)}><span className="k"><i>h</i>Régularisation des heures</span><span className="v" data-odometer-element data-value={eur(R.reg)}>{eur(R.reg)}</span></li>
                  <li style={d(2)}><span className="k"><i className="g">€</i>Indemnité de rupture</span><span className="v" data-odometer-element data-value={eur(R.rupture)}>{eur(R.rupture)}</span></li>
                  <li className="tot" style={d(3)}><span className="k">Total</span><span className="v" data-odometer-element data-value={eur(fin)}>{eur(fin)}</span></li>
                </ul>
              </div>
            </article>
          </Bento>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="dark" id="fonctionnement">
        <div className="shell">
          <div className="sec-head">
            <span className="eyebrow">Comment ça marche</span>
            <h2>Du contrat au salaire, <em>une étape à la fois.</em></h2>
            <p>Quatre blocs à remplir, dans l&apos;ordre du contrat. Les résultats se mettent à jour à chaque modification.</p>
          </div>
          <HowItWorks steps={STEPS} />
        </div>
      </section>

      {/* FAQ */}
      <section className="sec" id="faq">
        <div className="shell faq">
          <div className="faq-head">
            <span className="eyebrow">Questions</span>
            <h2>Les questions que <em>les parents posent.</em></h2>
            <p>Une autre question ? Le Relais Petite Enfance de votre commune peut vous répondre. Vous trouverez aussi des réponses sur le site de <a href="https://www.urssaf.fr/accueil/services/services-particuliers/service-pajemploi.html" target="_blank" rel="noopener noreferrer">Pajemploi</a>.</p>
            <Link href="/simulateur/" className="btn primary big">Faire une simulation</Link>
          </div>
          <Faq items={FAQ} />
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      </section>
    </>
  );
}
