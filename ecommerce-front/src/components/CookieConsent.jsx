import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/CookieConsent.css";

/**
 * Composant de bandeau de consentement aux cookies conforme RGPD/ePrivacy
 * Affiche un bandeau en bas de page pour demander le consentement aux cookies
 * Stocke les préférences dans localStorage
 */
export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Toujours activé (cookies essentiels)
    functional: false,
    analytics: false,
    advertising: false,
  });

  // Vérifier si le consentement a déjà été donné
  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      // Aucun consentement enregistré, afficher le bandeau
      setShowBanner(true);
    } else {
      // Charger les préférences sauvegardées
      try {
        const savedPreferences = JSON.parse(consent);
        setPreferences(savedPreferences);
      } catch (e) {
        console.error("Erreur lors du chargement des préférences cookies:", e);
        setShowBanner(true);
      }
    }
  }, []);

  // Appliquer les préférences (activer/désactiver les cookies selon le consentement)
  useEffect(() => {
    if (preferences.analytics) {
      // Activer Google Analytics ou autres outils d'analyse
      // Exemple: window.gtag && window.gtag('consent', 'update', { analytics_storage: 'granted' });
    }
    if (preferences.advertising) {
      // Activer les cookies publicitaires
      // Exemple: window.gtag && window.gtag('consent', 'update', { ad_storage: 'granted' });
    }
  }, [preferences]);

  // Accepter tous les cookies
  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      advertising: true,
    };
    setPreferences(allAccepted);
    localStorage.setItem("cookieConsent", JSON.stringify(allAccepted));
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    setShowBanner(false);
  };

  // Refuser tous les cookies (sauf nécessaires)
  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      functional: false,
      analytics: false,
      advertising: false,
    };
    setPreferences(onlyNecessary);
    localStorage.setItem("cookieConsent", JSON.stringify(onlyNecessary));
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    setShowBanner(false);
  };

  // Personnaliser les préférences
  const handleCustomize = () => {
    setShowPreferences(true);
  };

  // Sauvegarder les préférences personnalisées
  const handleSavePreferences = () => {
    localStorage.setItem("cookieConsent", JSON.stringify(preferences));
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    setShowBanner(false);
    setShowPreferences(false);
  };

  // Modifier une préférence individuelle
  const handleTogglePreference = (key) => {
    if (key === "necessary") return; // Les cookies nécessaires ne peuvent pas être désactivés
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Rouvrir le panneau de préférences
  const handleManageCookies = () => {
    setShowPreferences(true);
    setShowBanner(true);
  };

  // Exposer la fonction pour pouvoir l'appeler depuis le Footer
  useEffect(() => {
    window.openCookiePreferences = handleManageCookies;
    return () => {
      delete window.openCookiePreferences;
    };
  }, []);

  if (!showBanner && !showPreferences) {
    return null;
  }

  return (
    <>
      {/* Bandeau de consentement */}
      {showBanner && !showPreferences && (
        <div className="cookie-consent-banner" role="dialog" aria-label="Consentement aux cookies">
          <div className="cookie-consent-content">
            <div className="cookie-consent-text">
              <h3>🍪 Nous utilisons des cookies</h3>
              <p>
                Nous utilisons des cookies pour améliorer votre expérience de navigation, 
                analyser le trafic du site et personnaliser le contenu. 
                En cliquant sur "Accepter tout", vous acceptez notre utilisation des cookies. 
                Vous pouvez également{" "}
                <button 
                  type="button" 
                  className="cookie-link-button" 
                  onClick={handleCustomize}
                >
                  personnaliser vos préférences
                </button>{" "}
                ou consulter notre{" "}
                <Link to="/legal/cookies" className="cookie-link">
                  Politique des Cookies
                </Link>.
              </p>
            </div>
            <div className="cookie-consent-buttons">
              <button
                type="button"
                className="cookie-button cookie-button-reject"
                onClick={handleRejectAll}
              >
                Refuser tout
              </button>
              <button
                type="button"
                className="cookie-button cookie-button-accept"
                onClick={handleAcceptAll}
              >
                Accepter tout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panneau de préférences détaillées */}
      {showPreferences && (
        <div className="cookie-preferences-modal" role="dialog" aria-label="Préférences des cookies">
          <div className="cookie-preferences-content">
            <div className="cookie-preferences-header">
              <h2>Gérer vos préférences de cookies</h2>
              <p>
                Vous pouvez activer ou désactiver les différents types de cookies ci-dessous. 
                Les cookies strictement nécessaires ne peuvent pas être désactivés car ils sont 
                essentiels au fonctionnement du site.
              </p>
            </div>

            <div className="cookie-preferences-list">
              {/* Cookies nécessaires */}
              <div className="cookie-preference-item">
                <div className="cookie-preference-info">
                  <h3>Cookies strictement nécessaires</h3>
                  <p>
                    Ces cookies sont indispensables au fonctionnement du site. Ils permettent 
                    la navigation, l'authentification et la sécurité. Ils ne peuvent pas être désactivés.
                  </p>
                </div>
                <label className="cookie-toggle">
                  <input
                    type="checkbox"
                    checked={preferences.necessary}
                    disabled
                    readOnly
                  />
                  <span className="cookie-toggle-slider"></span>
                </label>
              </div>

              {/* Cookies de fonctionnalité */}
              <div className="cookie-preference-item">
                <div className="cookie-preference-info">
                  <h3>Cookies de fonctionnalité</h3>
                  <p>
                    Ces cookies permettent d'améliorer votre expérience en mémorisant vos 
                    préférences (langue, devise, etc.).
                  </p>
                </div>
                <label className="cookie-toggle">
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={() => handleTogglePreference("functional")}
                  />
                  <span className="cookie-toggle-slider"></span>
                </label>
              </div>

              {/* Cookies analytiques */}
              <div className="cookie-preference-item">
                <div className="cookie-preference-info">
                  <h3>Cookies analytiques</h3>
                  <p>
                    Ces cookies nous permettent d'analyser l'utilisation du site pour 
                    améliorer nos services et votre expérience.
                  </p>
                </div>
                <label className="cookie-toggle">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={() => handleTogglePreference("analytics")}
                  />
                  <span className="cookie-toggle-slider"></span>
                </label>
              </div>

              {/* Cookies publicitaires */}
              <div className="cookie-preference-item">
                <div className="cookie-preference-info">
                  <h3>Cookies publicitaires</h3>
                  <p>
                    Ces cookies permettent de vous proposer des publicités personnalisées 
                    en fonction de vos centres d'intérêt.
                  </p>
                </div>
                <label className="cookie-toggle">
                  <input
                    type="checkbox"
                    checked={preferences.advertising}
                    onChange={() => handleTogglePreference("advertising")}
                  />
                  <span className="cookie-toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="cookie-preferences-footer">
              <Link to="/legal/cookies" className="cookie-link">
                En savoir plus sur notre Politique des Cookies
              </Link>
              <div className="cookie-preferences-actions">
                <button
                  type="button"
                  className="cookie-button cookie-button-secondary"
                  onClick={() => {
                    setShowPreferences(false);
                    if (!localStorage.getItem("cookieConsent")) {
                      setShowBanner(true);
                    }
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="cookie-button cookie-button-accept"
                  onClick={handleSavePreferences}
                >
                  Enregistrer les préférences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

