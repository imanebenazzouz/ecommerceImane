import React from "react";
// Page légale: Médiation de la Consommation.
import "../../styles/LegalPages.css";

export default function Mediation() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Médiation de la Consommation</h1>
        <p className="last-update">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <section className="legal-section">
          <h2>1. Principe de la médiation</h2>
          <p>
            Conformément aux articles L.612-1 et suivants du Code de la consommation, 
            TechStore Pro s'engage à proposer à ses clients une solution de médiation 
            en cas de litige qui n'aurait pas pu être résolu directement avec notre 
            service client.
          </p>
          <p>
            La médiation est un processus gratuit, confidentiel et indépendant qui 
            permet de trouver une solution amiable à un différend entre un consommateur 
            et un professionnel.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Notre médiateur</h2>
          <p>
            En cas de litige non résolu avec notre service client, vous pouvez faire 
            appel à notre médiateur de la consommation :
          </p>
          <div style={{
            backgroundColor: "#f0f9ff",
            border: "1px solid #0ea5e9",
            borderRadius: 8,
            padding: 20,
            marginTop: 16
          }}>
            <h3 style={{ marginTop: 0 }}>Médiateur de la Consommation</h3>
            <ul style={{ marginBottom: 0 }}>
              <li><strong>Nom :</strong> Médiateur de la Consommation - Centre de la Médiation de la Consommation (CM2C)</li>
              <li><strong>Adresse :</strong> 14 rue Saint Jean, 75017 Paris</li>
              <li><strong>Site web :</strong> <a href="https://www.cm2c.net" target="_blank" rel="noopener noreferrer">www.cm2c.net</a></li>
              <li><strong>Email :</strong> contact@cm2c.net</li>
              <li><strong>Téléphone :</strong> +33 (0)1 89 47 00 14</li>
            </ul>
          </div>
        </section>

        <section className="legal-section">
          <h2>3. Conditions d'accès à la médiation</h2>
          <p>
            Vous pouvez saisir le médiateur si :
          </p>
          <ul>
            <li>Vous êtes un consommateur (personne physique agissant à des fins non professionnelles)</li>
            <li>Vous avez déjà tenté de résoudre le litige directement avec notre service client</li>
            <li>Le litige concerne un achat effectué sur notre site</li>
            <li>Le litige n'a pas été résolu dans un délai de 60 jours à compter de votre réclamation</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Procédure de médiation</h2>
          
          <h3>4.1 Étape 1 : Contacter notre service client</h3>
          <p>
            Avant de saisir le médiateur, vous devez avoir contacté notre service client 
            pour tenter de résoudre le litige à l'amiable. Vous pouvez nous contacter :
          </p>
          <ul>
            <li><strong>Par email :</strong> contact@techstore-pro.fr</li>
            <li><strong>Par téléphone :</strong> +33 (0)1 42 86 95 47</li>
            <li><strong>Via notre formulaire :</strong> <a href="/support">Page de contact</a></li>
            <li><strong>Par courrier :</strong> TechStore Pro - Service Client, 42 Avenue des Champs-Élysées, 75008 Paris</li>
          </ul>

          <h3>4.2 Étape 2 : Saisir le médiateur</h3>
          <p>
            Si après 60 jours, le litige n'est toujours pas résolu, vous pouvez saisir 
            le médiateur en lui adressant votre demande par :
          </p>
          <ul>
            <li><strong>Formulaire en ligne :</strong> <a href="https://www.cm2c.net" target="_blank" rel="noopener noreferrer">www.cm2c.net</a></li>
            <li><strong>Par courrier :</strong> Médiateur de la Consommation - CM2C, 14 rue Saint Jean, 75017 Paris</li>
            <li><strong>Par email :</strong> contact@cm2c.net</li>
          </ul>
          <p>
            Votre demande doit contenir :
          </p>
          <ul>
            <li>Vos coordonnées complètes (nom, prénom, adresse, email, téléphone)</li>
            <li>Le numéro de votre commande</li>
            <li>Un résumé du litige</li>
            <li>Les échanges avec notre service client (emails, courriers)</li>
            <li>Les pièces justificatives (factures, photos, etc.)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Caractéristiques de la médiation</h2>
          
          <h3>5.1 Gratuité</h3>
          <p>
            La médiation est <strong>entièrement gratuite</strong> pour le consommateur. 
            Les frais sont pris en charge par TechStore Pro.
          </p>

          <h3>5.2 Confidentialité</h3>
          <p>
            Toutes les informations échangées dans le cadre de la médiation sont 
            strictement confidentielles et ne peuvent être utilisées dans une procédure 
            judiciaire ultérieure.
          </p>

          <h3>5.3 Indépendance</h3>
          <p>
            Le médiateur est indépendant et impartial. Il ne représente ni le consommateur 
            ni le professionnel, mais cherche une solution équitable pour les deux parties.
          </p>

          <h3>5.4 Délai</h3>
          <p>
            Le médiateur s'engage à rendre une proposition de solution dans un délai 
            maximum de 90 jours à compter de la réception de votre demande complète.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Plateforme européenne de règlement des litiges en ligne (ODR)</h2>
          <p>
            Conformément au Règlement (UE) n°524/2013, vous pouvez également utiliser 
            la plateforme européenne de règlement des litiges en ligne (ODR) pour 
            soumettre votre réclamation :
          </p>
          <div style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #22c55e",
            borderRadius: 8,
            padding: 20,
            marginTop: 16
          }}>
            <h3 style={{ marginTop: 0 }}>Plateforme ODR</h3>
            <ul style={{ marginBottom: 0 }}>
              <li><strong>Site web :</strong> <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a></li>
              <li><strong>Email :</strong> <a href="mailto:ec-odr@ec.europa.eu">ec-odr@ec.europa.eu</a></li>
            </ul>
            <p style={{ marginTop: 12, marginBottom: 0, fontSize: "0.9rem", color: "#166534" }}>
              Cette plateforme permet aux consommateurs et aux professionnels de l'Union 
              Européenne de résoudre leurs litiges en ligne de manière simple et gratuite.
            </p>
          </div>
        </section>

        <section className="legal-section">
          <h2>7. Recours judiciaire</h2>
          <p>
            La médiation n'est pas obligatoire. Vous conservez toujours le droit de 
            saisir un tribunal compétent pour résoudre votre litige. La médiation ne 
            suspend pas les délais de prescription.
          </p>
          <p>
            <strong>Juridiction compétente :</strong> En cas de litige, les tribunaux 
            français sont seuls compétents, conformément à la législation française.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Engagement de TechStore Pro</h2>
          <p>
            TechStore Pro s'engage à :
          </p>
          <ul>
            <li>Répondre à toute demande de médiation dans les meilleurs délais</li>
            <li>Participer de bonne foi au processus de médiation</li>
            <li>Respecter les recommandations du médiateur si elles sont acceptées par les deux parties</li>
            <li>Informer les consommateurs de l'existence de la médiation et des coordonnées du médiateur</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>9. Textes de référence</h2>
          <p>
            La médiation de la consommation est régie par :
          </p>
          <ul>
            <li>Articles L.612-1 et suivants du Code de la consommation</li>
            <li>Décret n°2015-1382 du 30 octobre 2015 relatif à la médiation de la consommation</li>
            <li>Règlement (UE) n°524/2013 du Parlement européen et du Conseil du 21 mai 2013 relatif au règlement en ligne des litiges de consommation</li>
            <li>Directive 2013/11/UE du Parlement européen et du Conseil du 21 mai 2013 relative au règlement extrajudiciaire des litiges de consommation</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>10. Contact</h2>
          <p>
            Pour toute question concernant la médiation ou pour nous contacter avant 
            de saisir le médiateur :
          </p>
          <ul>
            <li><strong>Service Client :</strong> contact@techstore-pro.fr</li>
            <li><strong>Téléphone :</strong> +33 (0)1 42 86 95 47 (du lundi au vendredi, 9h-18h)</li>
            <li><strong>Courrier :</strong> TechStore Pro - Service Client, 42 Avenue des Champs-Élysées, 75008 Paris</li>
            <li><strong>Formulaire en ligne :</strong> <a href="/support">Page de contact</a></li>
          </ul>
        </section>
      </div>
    </div>
  );
}

