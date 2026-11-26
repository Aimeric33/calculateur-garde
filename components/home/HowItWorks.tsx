'use client';
import { useState } from 'react';

export interface HowStep {
  t: string;
  d: string;
  panel: { title: string; tag: string; rows: { k: string; v: string; tag?: string }[]; foot: string };
}

/**
 * Étapes cliquables : le texte à gauche, un aperçu de l'écran correspondant à droite.
 * Toutes les étapes sont empilées dans la même cellule de grille (seule l'active est visible),
 * la hauteur reste donc celle de l'étape la plus haute : rien ne saute au changement.
 */
export default function HowItWorks({ steps }: { steps: HowStep[] }) {
  const [i, setI] = useState(0);
  return (
    <div className="how">
      <div className="how-copy">
        <div className="stepper" role="group" aria-label="Étapes">
          {steps.map((st, k) => (
            <button key={st.t} type="button" aria-pressed={k === i} onClick={() => setI(k)} aria-label={`Étape ${k + 1} : ${st.t}`}>
              <span>{String(k + 1).padStart(2, '0')}</span><em><b>{st.t}</b></em>
            </button>
          ))}
        </div>
        <div className="stack">
          {steps.map((st, k) => (
            <div key={st.t} className="how-text" aria-hidden={k !== i} data-on={k === i || undefined}>
              <h3>{st.t}</h3>
              <p>{st.d}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="stack" aria-hidden="true">
        {steps.map((st, k) => (
          <div key={st.t} className="mock" data-on={k === i || undefined}>
            <div className="mock-h">{st.panel.title}<span className="tag n">{st.panel.tag}</span></div>
            <div className="mock-b">
              {st.panel.rows.map((r) => (
                <div className="mock-row" key={r.k}><span>{r.k}</span><b>{r.v}{r.tag && <span className="tag">{r.tag}</span>}</b></div>
              ))}
            </div>
            <div className="mock-f">{st.panel.foot}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
