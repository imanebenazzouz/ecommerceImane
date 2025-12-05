import React from "react";
// Page légale: Conditions Générales de Vente (CGV).
import "../../styles/LegalPages.css";

export default function CGV() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Conditions Générales de Vente</h1>
        <p className="last-update">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <section className="legal-section">
          <h2>1. Objet</h2>
          <p>
            Les présentes Conditions Générales de Vente (CGV) régissent les ventes de produits 
            effectuées sur le site TechStore. Toute commande implique l'acceptation pleine 
            et entière des présentes CGV.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Prix</h2>
          <p>
            Les prix de nos produits sont indiqués en euros toutes taxes comprises (TTC). 
            Nous nous réservons le droit de modifier nos prix à tout moment, mais les produits 
            seront facturés sur la base des tarifs en vigueur au moment de la validation de 
            la commande.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Commandes</h2>
          <p>
            Vous pouvez passer commande directement sur notre site internet. Toute commande 
            vaut acceptation des prix et descriptions des produits disponibles à la vente.
          </p>
          <ul>
            <li>La vente ne sera considérée comme valide qu'après l'envoi d'un email de confirmation</li>
            <li>Les informations contractuelles sont présentées en langue française</li>
            <li>La confirmation de commande vaut acceptation des présentes CGV</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Paiement</h2>
          <p>
            Le paiement s'effectue par carte bancaire de manière sécurisée. Le débit de la carte 
            est effectué au moment de la validation de la commande. Nous acceptons les cartes 
            Visa, Mastercard et American Express.
          </p>
          <p>
            <strong>Sécurité :</strong> Toutes les transactions sont sécurisées via un protocole 
            SSL/TLS. Les données bancaires ne sont jamais stockées sur nos serveurs.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Livraison</h2>
          <p>
            Les produits sont livrés à l'adresse de livraison indiquée lors de la commande. 
            Les délais de livraison sont indiqués à titre indicatif.
          </p>
          <ul>
            <li><strong>Livraison standard :</strong> 3-5 jours ouvrés</li>
            <li><strong>Livraison express :</strong> 24-48h</li>
            <li><strong>Frais de port :</strong> Calculés en fonction du poids et de la destination</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Droit de rétractation</h2>
          <p>
            Conformément aux articles L221-18 et suivants du Code de la consommation, 
            vous disposez d'un délai de 14 jours à compter de la réception de vos produits 
            pour exercer votre droit de rétractation sans avoir à justifier de motifs ni à 
            payer de pénalité.
          </p>
          <p>
            Les produits doivent être retournés dans leur état d'origine et complets 
            (emballage, accessoires, notice...) permettant leur recommercialisation.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Garanties</h2>
          <p>
            Tous nos produits bénéficient de la garantie légale de conformité 
            (articles L217-4 et suivants du Code de la consommation) et de la garantie 
            contre les vices cachés (articles 1641 et suivants du Code civil).
          </p>
          <ul>
            <li><strong>Garantie légale de conformité :</strong> 2 ans à compter de la livraison</li>
            <li><strong>Garantie des vices cachés :</strong> 2 ans à compter de la découverte du vice</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>8. Responsabilité</h2>
          <p>
            Notre responsabilité ne pourra être engagée en cas de non-respect de la 
            législation du pays dans lequel les produits sont livrés, il vous appartient 
            de vérifier auprès des autorités locales les possibilités d'importation ou 
            d'utilisation des produits.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Propriété intellectuelle</h2>
          <p>
            Tous les éléments du site (textes, images, logos, vidéos, etc.) sont protégés 
            par le droit de la propriété intellectuelle. Toute reproduction, représentation, 
            modification ou adaptation est strictement interdite sans autorisation préalable.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Données personnelles</h2>
          <p>
            Les informations collectées font l'objet d'un traitement informatique destiné 
            à la gestion de votre commande. Conformément au RGPD, vous disposez d'un droit 
            d'accès, de rectification et de suppression de vos données.
          </p>
          <p>
            Pour plus d'informations, consultez notre{" "}
            <a href="/legal/confidentialite">Politique de Confidentialité</a>.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Litiges et médiation</h2>
          <p>
            En cas de litige, vous pouvez recourir à une procédure de médiation conventionnelle 
            ou tout autre mode alternatif de règlement des différends. Les présentes CGV sont 
            soumises au droit français.
          </p>
          
          <h3>11.1 Médiation de la consommation</h3>
          <p>
            Conformément aux articles L.612-1 et suivants du Code de la consommation, 
            vous pouvez faire appel à notre médiateur de la consommation :
          </p>
          <ul>
            <li><strong>Médiateur :</strong> Médiateur de la Consommation - CM2C</li>
            <li><strong>Adresse :</strong> 14 rue Saint Jean, 75017 Paris</li>
            <li><strong>Site web :</strong> <a href="https://www.cm2c.net" target="_blank" rel="noopener noreferrer">www.cm2c.net</a></li>
            <li><strong>Email :</strong> contact@cm2c.net</li>
            <li><strong>Téléphone :</strong> +33 (0)1 89 47 00 14</li>
          </ul>
          <p>
            Pour plus d'informations, consultez notre{" "}
            <a href="/legal/mediation">page de médiation</a>.
          </p>

          <h3>11.2 Plateforme européenne de règlement des litiges en ligne (ODR)</h3>
          <p>
            Conformément au Règlement (UE) n°524/2013, vous pouvez également utiliser 
            la plateforme européenne de règlement des litiges en ligne (ODR) pour 
            soumettre votre réclamation :
          </p>
          <ul>
            <li><strong>Site web :</strong> <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a></li>
            <li><strong>Email :</strong> <a href="mailto:ec-odr@ec.europa.eu">ec-odr@ec.europa.eu</a></li>
          </ul>
          <p>
            Cette plateforme permet aux consommateurs et aux professionnels de l'Union 
            Européenne de résoudre leurs litiges en ligne de manière simple et gratuite.
          </p>

          <h3>11.3 Recours judiciaire</h3>
          <p>
            La médiation n'est pas obligatoire. Vous conservez toujours le droit de 
            saisir un tribunal compétent pour résoudre votre litige. En cas de litige, 
            les tribunaux français sont seuls compétents, conformément à la législation française.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Contact</h2>
          <p>
            Pour toute question concernant les présentes CGV, vous pouvez nous contacter :
          </p>
          <ul>
            <li><strong>Par email :</strong> contact@techstore-pro.fr</li>
            <li><strong>Par courrier :</strong> TechStore Pro, Service Client, 42 Avenue des Champs-Élysées, 75008 Paris</li>
            <li><strong>Via notre formulaire :</strong> <a href="/support">Page de contact</a></li>
          </ul>
        </section>
      </div>
    </div>
  );
}

