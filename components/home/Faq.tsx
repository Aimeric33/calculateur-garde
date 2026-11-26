'use client';
import { useId, useState } from 'react';

/**
 * Accordéon de la FAQ (animation de la ressource « Accordion CSS » d'Osmo Supply) :
 * la réponse s'ouvre en animant grid-template-rows de 0fr à 1fr, l'icône tourne avec la même courbe.
 * L'état est porté par React mais reste exposé via les mêmes attributs data-accordion-*,
 * et ouvrir une question referme les autres (close-siblings = true).
 * Les réponses restent dans le HTML (référencement), seulement repliées.
 */
export default function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const id = useId();
  return (
    <div className="qa" data-accordion-close-siblings="true" data-accordion-css-init="">
      <ul className="qa-list">
        {items.map((f, k) => {
          const active = open === k;
          return (
            <li key={f.q} className="qa-item" data-accordion-status={active ? 'active' : 'not-active'}>
              <h3 className="qa-h">
                <button
                  type="button"
                  className="qa-top"
                  data-accordion-toggle=""
                  aria-expanded={active}
                  aria-controls={`${id}-${k}`}
                  onClick={() => setOpen(active ? null : k)}
                >
                  <span>{f.q}</span>
                  <span className="qa-icon" aria-hidden="true">
                    <svg viewBox="0 0 12 12" width="12" height="12"><path d="M6 1.5v9M1.5 6h9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </span>
                </button>
              </h3>
              <div className="qa-bottom" id={`${id}-${k}`} role="region" aria-label={f.q}>
                <div className="qa-wrap">
                  <div className="qa-content"><p>{f.a}</p></div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
