'use client';
import { useEffect, useMemo, useState } from 'react';
import { EXAMPLE, analyse, buildParams, isComplete, simulate, type FormState } from '@/lib/engine';
import FormPanel from './FormPanel';
import Results from './Results';
import PrintSheet from './PrintSheet';

const STORAGE_KEY = 'simulateur-nounou:v1';
const clone = (s: FormState): FormState => JSON.parse(JSON.stringify(s));

function loadState(): FormState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const s = JSON.parse(raw); if (s && s.days && s.vac && s.chg) return { ...clone(EXAMPLE), ...s }; }
  } catch { /* stockage indisponible : on part de l'exemple */ }
  return clone(EXAMPLE);
}

export default function Simulator() {
  const [s, setS] = useState<FormState>(() => clone(EXAMPLE));
  const [ready, setReady] = useState(false);
  const [printView, setPrintView] = useState(false);

  // Paramètres mémorisés dans le navigateur du visiteur, jamais envoyés.
  useEffect(() => { setS(loadState()); setReady(true); }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignoré */ } } }, [s, ready]);

  const set = (p: Partial<FormState>) => setS((prev) => ({ ...prev, ...p }));
  const P = useMemo(() => buildParams(s), [s]);
  const A = useMemo(() => analyse(s, P), [s, P]);
  const sims = useMemo(() => {
    if (A.blocking) return null;
    const F = isComplete(s) ? 'C' : 'I';
    return { R: simulate(P, F), RO: simulate(P, F === 'C' ? 'I' : 'C') };
  }, [s, P, A.blocking]);

  return (
    <div className="wrap">
      <header className="top">
        <h1>Simulateur salaire assistante maternelle</h1>
        <p className="lead">Renseignez le contrat, le planning et les vacances : la simulation calcule le salaire mois par mois, les congés payés et ce qui est dû en fin de contrat. Les valeurs déjà remplies sont un exemple.</p>
        <div className="viewbar">
          {!printView
            ? <button type="button" className="btn primary" onClick={() => setPrintView(true)} disabled={!sims}>Version imprimable</button>
            : <>
                <button type="button" className="btn" onClick={() => setPrintView(false)}>Retour au simulateur</button>
                <button type="button" className="btn primary" onClick={() => window.print()}>Imprimer ou enregistrer en PDF</button>
              </>}
        </div>
      </header>

      {printView && sims ? (
        <div id="printView"><div className="sheetwrap"><PrintSheet s={s} P={P} R={sims.R} /></div></div>
      ) : (
        <div className="layout">
          <FormPanel s={s} set={set} P={P} A={A} onReset={() => setS(clone(EXAMPLE))} />
          <section className="results" aria-live="polite">
            <div className="alerts">
              {A.blocking && <div className="alert"><b>À corriger.</b> {A.blocking}</div>}
              {A.alerts.map((a) => <div className="alert" key={a.title}><b>{a.title}</b> {a.text}</div>)}
            </div>
            {sims && <Results R={sims.R} RO={sims.RO} P={P} />}
            <footer>Simulation indicative, fondée sur la convention collective des particuliers employeurs (IDCC 3239). Les jours fériés chômés sont payés. Montants nets. Pour un cas particulier, demandez confirmation au Relais Petite Enfance ou à Pajemploi.</footer>
          </section>
        </div>
      )}
    </div>
  );
}
