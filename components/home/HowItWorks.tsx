'use client';
import { useState } from 'react';

export interface HowStep {
  t: string;
  d: string;
  panel: { title: string; tag: string; rows: { k: string; v: string; tag?: string }[]; foot: string };
}

/** Étapes cliquables : le texte à gauche, un aperçu de l'écran correspondant à droite. */
export default function HowItWorks({ steps }: { steps: HowStep[] }) {
  const [i, setI] = useState(0);
  const s = steps[i];
  return (
    <div className="how">
      <div className="how-copy">
        <div className="stepper" role="group" aria-label="Étapes">
          {steps.map((st, k) => (
            <button key={st.t} type="button" aria-pressed={k === i} onClick={() => setI(k)} aria-label={`Étape ${k + 1} : ${st.t}`}>
              <span>{String(k + 1).padStart(2, '0')}</span><em>{st.t}</em>
            </button>
          ))}
        </div>
        <h3 key={`t${i}`}>{s.t}</h3>
        <p key={`d${i}`}>{s.d}</p>
      </div>
      <div className="mock" aria-hidden="true">
        <div className="mock-h">{s.panel.title}<span className="tag n">{s.panel.tag}</span></div>
        <div className="mock-b" key={i}>
          {s.panel.rows.map((r) => (
            <div className="mock-row" key={r.k}><span>{r.k}</span><b>{r.v}{r.tag && <span className="tag">{r.tag}</span>}</b></div>
          ))}
        </div>
        <div className="mock-f">{s.panel.foot}</div>
      </div>
    </div>
  );
}
