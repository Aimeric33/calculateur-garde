const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Montant en euros ; « — » pour zéro sauf si dash = false. */
export const eur = (x: number, dash = true) =>
  dash && Math.abs(x) < 0.005 ? '—' : nf2.format(Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * 100) / 100).replace(/ /g, ' ') + ' €';

/** Montant signé : « + 12,00 € », « − 3,50 € ». */
export const sgn = (x: number) => (x > 0.005 ? '+ ' : x < -0.005 ? '− ' : '') + eur(Math.abs(x), false);

/** Nombre décimal à la française, sans zéros inutiles. */
export const num = (x: number, d = 2) => {
  const s = (Math.round(x * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
  return s.replace(/,?0+$/, '') || '0';
};

/** Durée en heures : 9,5 → « 9 h 30 ». */
export const hm = (h: number) => {
  const t = Math.round(h * 60), H = Math.floor(t / 60), mm = t % 60;
  return mm ? `${H} h ${String(mm).padStart(2, '0')}` : `${H} h`;
};
