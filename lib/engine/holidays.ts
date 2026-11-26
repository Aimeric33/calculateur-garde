import { DAY, Y } from './dates';

export type HolidayKey =
  | 'jan' | 'paques' | 'mai1' | 'mai8' | 'asc' | 'pent' | 'jul14' | 'aou15' | 'nov1' | 'nov11' | 'noel';

/** Jours fériés que les parents peuvent marquer comme travaillés (la journée de solidarité ne s'applique pas aux assistantes maternelles). */
export const FERIES: [HolidayKey, string][] = [
  ['jan', '1er janvier'], ['paques', 'Lundi de Pâques'], ['mai1', '1er mai'], ['mai8', '8 mai'],
  ['asc', "Jeudi de l'Ascension"], ['pent', 'Lundi de Pentecôte'], ['jul14', '14 juillet'], ['aou15', '15 août'],
  ['nov1', '1er novembre'], ['nov11', '11 novembre'], ['noel', '25 décembre'],
];

function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, mo - 1, da) / DAY;
}

const cache = new Map<number, Map<number, HolidayKey>>();
function holidaysOf(y: number) {
  let m = cache.get(y);
  if (!m) {
    const e = easter(y), u = (mo: number, d: number) => Date.UTC(y, mo - 1, d) / DAY;
    m = new Map<number, HolidayKey>([
      [u(1, 1), 'jan'], [e + 1, 'paques'], [u(5, 1), 'mai1'], [u(5, 8), 'mai8'], [e + 39, 'asc'], [e + 50, 'pent'],
      [u(7, 14), 'jul14'], [u(8, 15), 'aou15'], [u(11, 1), 'nov1'], [u(11, 11), 'nov11'], [u(12, 25), 'noel'],
    ]);
    cache.set(y, m);
  }
  return m;
}
export const isHoliday = (n: number) => holidaysOf(Y(n)).has(n);
export const holidayKey = (n: number) => holidaysOf(Y(n)).get(n);
