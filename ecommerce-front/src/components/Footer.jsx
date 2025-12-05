import React from "react";
// Pied de page du site: liens légaux, service client et compte.
import { Link } from "react-router-dom";
import "../styles/Footer.css";

/**
 * Pied de page global avec liens légaux et informations service client.
 * @returns {JSX.Element}
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Section À propos */}
        <div className="footer-section">
          <h3>À propos</h3>
          <p className="footer-description">
            TechStore Pro - Votre spécialiste en technologie et électronique depuis 2015. 
            Nous proposons les dernières innovations tech avec un service client d'exception.
          </p>
          <div className="footer-social">
            <a href="#" aria-label="Facebook" title="Facebook">
              <i className="social-icon">f</i>
            </a>
            <a href="#" aria-label="Twitter" title="Twitter">
              <i className="social-icon">𝕏</i>
            </a>
            <a href="#" aria-label="Instagram" title="Instagram">
              <i className="social-icon">📷</i>
            </a>
            <a href="#" aria-label="LinkedIn" title="LinkedIn">
              <i className="social-icon">in</i>
            </a>
          </div>
        </div>

        {/* Section Informations légales */}
        <div className="footer-section">
          <h3>Informations légales</h3>
          <ul className="footer-links">
            <li>
              <Link to="/legal/cgv">Conditions Générales de Vente</Link>
            </li>
            <li>
              <Link to="/legal/mentions-legales">Mentions Légales</Link>
            </li>
            <li>
              <Link to="/legal/confidentialite">Politique de Confidentialité (RGPD)</Link>
            </li>
            <li>
              <Link to="/legal/cookies">Politique des Cookies</Link>
            </li>
            <li>
              <Link to="/legal/retractation">Droit de Rétractation</Link>
            </li>
            <li>
              <Link to="/legal/mediation">Médiation de la Consommation</Link>
            </li>
            <li>
              <button 
                type="button"
                className="footer-link-button"
                onClick={() => {
                  // Rouvrir le panneau de gestion des cookies
                  if (window.openCookiePreferences) {
                    window.openCookiePreferences();
                  } else {
                    // Fallback: recharger la page après avoir supprimé le consentement
                    localStorage.removeItem("cookieConsent");
                    window.location.reload();
                  }
                }}
              >
                Gérer les cookies
              </button>
            </li>
          </ul>
        </div>

        {/* Section Service client */}
        <div className="footer-section">
          <h3>Service client</h3>
          <ul className="footer-links">
            <li>
              <Link to="/faq">FAQ - Questions Fréquentes</Link>
            </li>
            <li>
              <Link to="/support">Nous Contacter</Link>
            </li>
            <li>
              <Link to="/livraison">Livraison & Retours</Link>
            </li>
            <li>
              <Link to="/paiement-securise">Paiement Sécurisé</Link>
            </li>
            <li>
              <Link to="/garanties">Garanties</Link>
            </li>
          </ul>
        </div>

        {/* Section Mon compte */}
        <div className="footer-section">
          <h3>Mon compte</h3>
          <ul className="footer-links">
            <li>
              <Link to="/profile">Mon Profil</Link>
            </li>
            <li>
              <Link to="/orders">Mes Commandes</Link>
            </li>
            <li>
              <Link to="/cart">Mon Panier</Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Barre de copyright */}
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>
            © {currentYear} TechStore Pro. Tous droits réservés.
          </p>
          <p className="footer-compliance">
            <span title="Conforme RGPD">🔒 Conforme RGPD</span>
            <span className="separator">•</span>
            <span title="Paiement sécurisé">💳 Paiement 100% sécurisé</span>
            <span className="separator">•</span>
            <span title="Satisfait ou remboursé">✓ Satisfait ou remboursé</span>
          </p>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "8px" }}>
            En cas de litige, vous pouvez utiliser la{" "}
            <a 
              href="https://ec.europa.eu/consumers/odr" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: "#2563eb", textDecoration: "underline" }}
            >
              plateforme européenne de règlement des litiges en ligne (ODR)
            </a>
            {" "}ou consulter notre{" "}
            <Link to="/legal/mediation" style={{ color: "#2563eb", textDecoration: "underline" }}>
              page de médiation
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}

