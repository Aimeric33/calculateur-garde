# Simulateur Nounou

Simulateur gratuit du salaire d'une assistante maternelle agréée (convention collective IDCC 3239) :
salaire mensualisé en année complète ou incomplète, congés payés, heures majorées, jours fériés,
changement de planning et fin de contrat, mois par mois, avec une version imprimable.

Le site est construit avec **Next.js (App Router) + React + TypeScript** et exporté en **site statique** :
aucun serveur ni base de données, les calculs se font dans le navigateur.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # tests du moteur de calcul
npm run build    # génère le site statique dans out/
```

## Organisation

```
app/                      pages (accueil, simulateur, mentions légales), sitemap, robots, icône
components/               en-tête et pied de page
components/simulator/     formulaire, résultats, version imprimable
lib/engine/               moteur de calcul pur (sans React), testé avec Vitest
  simulate.ts             mensualisation, congés payés, retenues, majorations, fin de contrat
  params.ts               état du formulaire, exemple, contrôles et alertes
  dates.ts, holidays.ts   dates, jours fériés français (Pâques calculé)
lib/site.ts               nom, slogan et URL du site (à personnaliser)
```

## Mettre en ligne

Le dossier `out/` peut être hébergé n'importe où. Le plus simple :

- **Vercel** : importer le dépôt GitHub, aucun réglage nécessaire.
- **Netlify** : commande de build `npm run build`, dossier de publication `out`.

## Avant la publication

- Choisir le nom et le domaine, puis mettre à jour `lib/site.ts`.
- Compléter les éléments surlignés dans `app/mentions-legales/page.tsx` (éditeur, hébergeur).
- Mettre à jour les minimums réglementaires dans `lib/engine/params.ts` à chaque revalorisation.

## Règles de calcul retenues

- Mensualisation : heures (45 h par semaine au plus) × taux × semaines ÷ 12 (52 semaines en année complète).
- Heures au-delà de 45 h : payées en plus chaque mois, au réel, au taux majoré du contrat (10 % minimum).
- Congés payés : 2,5 jours ouvrables par 4 semaines, période du 1er juin au 31 mai, décompte en jours ouvrables,
  montant le plus favorable entre maintien de salaire et 10 %.
- Année incomplète : paiement des congés en juin, au congé principal ou à chaque prise.
- Retenues en année complète : salaire mensualisé × heures d'absence ÷ heures prévues dans le mois.
- Jours fériés chômés payés ; fériés travaillés majorés (10 % minimum, 1er mai à 100 %).
- Fin de contrat : indemnité de congés non pris, régularisation des heures (année incomplète),
  indemnité de rupture de 1/80 des salaires bruts à partir de 9 mois d'ancienneté.

Les résultats sont indicatifs ; pour un cas particulier, se référer au Relais Petite Enfance ou à Pajemploi.
