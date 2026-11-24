import type { Metadata } from 'next';
import Simulator from '@/components/simulator/Simulator';

export const metadata: Metadata = {
  title: 'Simulateur de salaire',
  description:
    "Calculez le salaire mensualisé d'une assistante maternelle, les congés payés, les heures majorées, les jours fériés et la fin de contrat, mois par mois.",
  alternates: { canonical: '/simulateur/' },
};

export default function SimulateurPage() {
  return <Simulator />;
}
