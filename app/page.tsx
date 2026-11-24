import Link from 'next/link';
import { EXAMPLE, buildParams, eur, num, simulate } from '@/lib/engine';

// Exemple calculé au moment de la construction du site avec le même moteur que le simulateur.
const P = buildParams(EXAMPLE);
const R = simulate(P, 'I');
const juin = R.rows.find((r) => r.y === 2028 && r.mo === 6)!;

const FEATURES = [
  { t: 'Année complète ou incomplète', d: 'Le type de contrat est déduit des semaines de vacances. Le salaire mensualisé est calculé sur 52 semaines ou sur les semaines d’accueil.' },
  { t: 'Congés payés', d: 'Jours acquis mois par mois, prise en jours ouvrables, maintien de salaire ou 10 %, et trois façons de les payer en année incomplète.' },
  { t: 'Heures majorées et jours fériés', d: 'Heures au-delà de 45 h payées chaque mois au réel, jours fériés travaillés majorés, 1er mai, lundi de Pentecôte.' },
  { t: 'Fin de contrat', d: 'Congés non pris, régularisation des heures en année incomplète, indemnité de rupture et préavis.' },
];

const STEPS = [
  { t: 'Le contrat', d: 'Dates de début et de fin, salaire horaire net.' },
  { t: 'Le planning', d: 'Horaires jour par jour, et un second planning si les horaires changent en cours de route.' },
  { t: 'Les vacances', d: 'Nombre de semaines par an et dates prévues, jours fériés travaillés.' },
  { t: 'Le résultat', d: 'Tableau mois par mois, détail des congés payés et de la fin de contrat, version à imprimer.' },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="in">
          <div>
            <h1>Le salaire de votre assistante maternelle, <em>mois par mois</em></h1>
            <p className="lead">Entrez le contrat, le planning et les vacances. Salaire, congés payés et fin de contrat sont calculés et expliqués.</p>
            <div className="ctas">
              <Link href="/simulateur/" className="btn primary big">Faire une simulation</Link>
            </div>
          </div>
          <div className="payslip" aria-label="Exemple de résultat">
            <div className="ttl">Exemple de contrat <span>année incomplète · {R.weeks} semaines</span></div>
            <dl>
              <dt>Planning</dt><dd>{num(R.H)} h / semaine</dd>
              <dt>Salaire horaire net</dt><dd>{eur(P.phases[0].rate)}</dd>
              <dt>Salaire mensualisé</dt><dd>{eur(R.full)}</dd>
              <dt>Congés payés, versés en juin 2028</dt><dd>+ {eur(juin.cpPay)}</dd>
              <dt>Fin de contrat (congés, régularisation, rupture)</dt><dd>{eur(R.iccp + R.reg + R.rupture)}</dd>
              <dt className="sum">Total net sur {R.rows.length} mois</dt><dd className="sum">{eur(R.grand)}</dd>
            </dl>
            <p className="note">Calculé avec les valeurs d&apos;exemple du simulateur.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Ce que calcule le simulateur</h2>
        <div className="feat">
          {FEATURES.map((f) => <div className="box" key={f.t}><h3>{f.t}</h3><p>{f.d}</p></div>)}
        </div>
      </section>

      <section className="section">
        <h2>Quatre étapes</h2>
        <ol className="steps">
          {STEPS.map((s) => <li key={s.t}><h3>{s.t}</h3><p>{s.d}</p></li>)}
        </ol>
        <p className="trust"><b>Gratuit, sans inscription, et vos données restent chez vous.</b>Vos paramètres restent dans votre navigateur : rien n&apos;est envoyé ni enregistré sur un serveur. Les calculs suivent la convention collective des particuliers employeurs (IDCC 3239) et restent indicatifs : pour un cas particulier, demandez confirmation au Relais Petite Enfance ou à Pajemploi.</p>
      </section>
    </>
  );
}
