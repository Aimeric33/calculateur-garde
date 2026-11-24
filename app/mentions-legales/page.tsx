import type { Metadata } from 'next';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: `Mentions légales et politique de confidentialité de ${SITE.name}.`,
  alternates: { canonical: '/mentions-legales/' },
};

// Les éléments surlignés sont à compléter avant la mise en ligne.
const Todo = ({ children }: { children: React.ReactNode }) => <span className="todo">{children}</span>;

export default function MentionsLegales() {
  return (
    <article className="prose">
      <h1>Mentions légales</h1>

      <h2>Éditeur du site</h2>
      <p>
        {SITE.name} est édité par <Todo>[prénom et nom de l&apos;éditeur]</Todo>, <Todo>[adresse postale]</Todo>.
        Contact : <Todo>[adresse e-mail]</Todo>. Directeur de la publication : <Todo>[prénom et nom]</Todo>.
      </p>

      <h2>Hébergement</h2>
      <p>Le site est hébergé par <Todo>[nom de l&apos;hébergeur, adresse et téléphone]</Todo>.</p>

      <h2>Nature des informations</h2>
      <p>
        Le simulateur fournit une estimation indicative du salaire d&apos;une assistante maternelle agréée, établie à partir de la
        convention collective nationale des particuliers employeurs et de l&apos;emploi à domicile (IDCC 3239) et des informations
        publiées par l&apos;administration. Il ne remplace ni le contrat de travail, ni les déclarations Pajemploi, ni l&apos;avis du Relais
        Petite Enfance ou d&apos;un professionnel. L&apos;éditeur ne peut être tenu responsable d&apos;une décision prise sur la base de ces
        résultats.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Les informations saisies dans le simulateur (dates, horaires, salaire, vacances) sont traitées uniquement dans votre
        navigateur. Elles ne sont ni transmises, ni enregistrées sur un serveur. Pour vous éviter de tout ressaisir, elles sont
        conservées dans le stockage local de votre navigateur ; vous pouvez les effacer à tout moment en vidant les données du site
        dans les réglages du navigateur.
      </p>
      <p>Le site n&apos;utilise ni cookie publicitaire, ni outil de mesure d&apos;audience. <Todo>[À mettre à jour si un outil de statistiques est ajouté.]</Todo></p>

      <h2>Propriété intellectuelle</h2>
      <p>Les textes, le code et la présentation du site sont la propriété de l&apos;éditeur, sauf mention contraire.</p>
    </article>
  );
}
