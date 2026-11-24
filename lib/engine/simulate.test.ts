import { describe, expect, it } from 'vitest';
import { buildParams, EXAMPLE, simulate, type FormState } from '@/lib/engine';

const round = (x: number) => Math.round(x * 100) / 100;

describe('exemple par défaut (année incomplète, 44 semaines)', () => {
  const P = buildParams(EXAMPLE);
  const R = simulate(P, 'I');

  it('calcule le salaire mensualisé', () => {
    expect(round(R.full)).toBe(681.91); // 43,25 h × 44 × 4,30 ÷ 12
  });
  it('proratise le premier mois', () => {
    expect(round(R.rows[0].mens)).toBe(649.08); // début le 4 janvier
  });
  it('retrouve les totaux de la simulation validée', () => {
    expect(round(R.grand)).toBe(24897.42);
    expect(round(R.reg)).toBe(156.81);
  });
});

describe('planning qui change et heures majorées (cas réel, année complète)', () => {
  const two = { 1: [false, '08:30', '18:00'], 2: [true, '08:30', '18:00'], 3: [false, '08:30', '18:00'], 4: [true, '08:30', '18:00'], 5: [false, '08:30', '18:00'], 6: [false, '08:30', '12:30'] } as FormState['days'];
  const full = { 1: [true, '08:30', '18:00'], 2: [true, '08:30', '18:00'], 3: [true, '08:30', '18:00'], 4: [true, '08:30', '18:00'], 5: [true, '08:30', '18:00'], 6: [false, '08:30', '12:30'] } as FormState['days'];
  const s: FormState = {
    ...EXAMPLE, start: '2026-12-07', end: '2029-08-31', rate: 4.5, maj: 10, vacWeeks: 5, ent: 4.79,
    days: two, chg: { on: true, date: '2027-03-01', rate: 3.5, days: full },
    vac: [['2026-12-21', '2027-01-03'], ['2027-04-19', '2027-04-24'], ['2027-08-09', '2027-08-28'], ['2027-12-20', '2027-12-26'],
      ['2028-04-17', '2028-04-22'], ['2028-08-07', '2028-08-26'], ['2028-12-25', '2028-12-31'], ['2029-04-16', '2029-04-21'], ['2029-08-06', '2029-08-25']],
  };
  const R = simulate(buildParams(s), 'C');
  it('mensualise 45 h et paie les heures majorées à part', () => {
    expect(round(R.full)).toBe(682.5);
    const mars = R.rows.find((r) => r.y === 2027 && r.mo === 3)!;
    expect(mars.majH).toBe(10);
    expect(round(mars.majPay)).toBe(38.5);
  });
  it('retrouve le total du PDF envoyé', () => {
    expect(round(R.grand)).toBe(22795.42);
  });
});
