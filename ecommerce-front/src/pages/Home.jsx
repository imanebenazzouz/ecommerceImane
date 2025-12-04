// ============================================================
// PAGE D'ACCUEIL (Home)
// ============================================================
// 
// Cette page est la page principale du site e-commerce.
// Elle présente la boutique avec trois panneaux d'images visuels.
//
// FONCTIONNALITÉS :
// - Section hero avec trois panneaux d'images horizontaux
// - Présentation visuelle du processus de création
// - Design moderne avec fond rose clair
// ============================================================

// ========== IMPORTS ==========
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "../styles/global.css";
// Images
import imgDesign from "../assets/43B8214E-E7F7-4BD9-8AD5-391BB7F348D6.jpeg";
import imgPhotoshoot from "../assets/EC0A3053-1C86-4949-BFED-F6774EA35CCB.jpeg";
import imgContentReview from "../assets/FF43C21E-9494-40F7-B10A-A251DF3237C3.jpeg";
import imgFitGirls from "../assets/image3.jpeg";

// ========== COMPOSANT PRINCIPAL ==========
/**
 * Composant Home - Page d'accueil du site
 * 
 * Cette page accueille les visiteurs avec des images visuelles.
 * 
 * @returns {JSX.Element} La page d'accueil avec trois panneaux d'images
 */
export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page home-page--visual">
      {/* ===== SECTION HERO AVEC TROIS PANNEAUX ===== */}
      <section className="home-visual-hero">
        <div className="home-visual-hero__content">
          <h2 className="home-visual-hero__title">Notre Processus de Création</h2>
          <div className="home-visual-hero__panels">
            {/* Panneau 1 - Design et Développement */}
            <div className="home-visual-panel">
              <img 
                src={imgDesign}
                alt="Design et développement - Session de création avec échantillons de couleurs et croquis"
                className="home-visual-panel__image"
              />
            </div>

            {/* Panneau 2 - Photoshoot */}
            <div className="home-visual-panel">
              <img 
                src={imgPhotoshoot}
                alt="Photoshoot - Modèle posant dans un studio avec portant à vêtements"
                className="home-visual-panel__image"
              />
            </div>

            {/* Panneau 3 - Revue de Contenu */}
            <div className="home-visual-panel">
              <img 
                src={imgContentReview}
                alt="Revue de contenu - Équipe examinant les images sur écran"
                className="home-visual-panel__image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION FIT GIRLS ===== */}
      <section className="home-fit-girls">
        <div className="home-fit-girls__container">
          <div className="home-fit-girls__image">
            <img 
              src={imgFitGirls}
              alt="Fit Girls - Modèle en tenue sportive"
              className="home-fit-girls__img"
            />
          </div>
          <div className="home-fit-girls__content">
            <h2 className="home-fit-girls__title">POUR MES FIT GIRLS</h2>
            <h3 className="home-fit-girls__subtitle">RAYONNEZ AVEC LES ENSEMBLES</h3>
            <p className="home-fit-girls__brand">YOURSHAPE.</p>
            <p className="home-fit-girls__tagline">JOLIE + SPORTIVE QUOI DE PLUS</p>
            <p className="home-fit-girls__tagline">FINALEMENT?</p>
            <Link to="/catalog" className="home-fit-girls__cta">
              EN SAVOIR PLUS !
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SECTION AVANTAGES ===== */}
      <section className="home-features-bar">
        <div className="home-features-bar__container">
          <div className="home-features-bar__item">
            <div className="home-features-bar__icon">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3L4 8V16L12 21L20 16V8L12 3Z" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="#e8cfda"/>
                <path d="M12 12L4 8M12 12L20 8M12 12V21" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="home-features-bar__title">QUALITÉ PREMIUM</h3>
            <p className="home-features-bar__description">Matériaux soigneusement sélectionnés pour votre confort et votre performance</p>
          </div>

          <div className="home-features-bar__item">
            <div className="home-features-bar__icon">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="8" width="18" height="12" rx="2" stroke="#1a1a1a" strokeWidth="1.5" fill="#e8cfda"/>
                <path d="M3 10L12 15L21 10" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 12L8 20M16 12V20" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M12 8V3M12 8L9 6M12 8L15 6" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="home-features-bar__title">LIVRAISON</h3>
            <p className="home-features-bar__description">Livraison offerte à partir de 90€</p>
          </div>

          <div className="home-features-bar__item">
            <div className="home-features-bar__icon">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="6" width="20" height="14" rx="2" stroke="#1a1a1a" strokeWidth="1.5" fill="#e8cfda"/>
                <line x1="2" y1="11" x2="22" y2="11" stroke="#1a1a1a" strokeWidth="1.5"/>
                <circle cx="7" cy="15" r="1.5" fill="#1a1a1a"/>
                <circle cx="17" cy="15" r="1.5" fill="#1a1a1a"/>
                <path d="M12 6V3M12 6L9 4M12 6L15 4" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="home-features-bar__title">PAIEMENT</h3>
            <p className="home-features-bar__description">Paiement sécurisé et protégé</p>
          </div>

          <div className="home-features-bar__item">
            <div className="home-features-bar__icon">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="4" stroke="#1a1a1a" strokeWidth="1.5" fill="#e8cfda"/>
                <path d="M6 21C6 17.134 8.686 14 12 14C15.314 14 18 17.134 18 21" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 19L4 18L3 19M21 19L20 18L19 19" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="home-features-bar__title">SERVICE CLIENT</h3>
            <p className="home-features-bar__description">Votre satisfaction est notre priorité. Notre équipe vous répond rapidement</p>
          </div>
        </div>
      </section>
    </div>
  );
}
