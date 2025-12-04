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
      </section>

      {/* ===== SECTION APPEL À L'ACTION ===== */}
      <section className="home-cta-visual">
        <div className="home-cta-visual__content">
          <h2 className="home-cta-visual__title">Découvrez notre collection</h2>
          <p className="home-cta-visual__description">
            Des produits soigneusement sélectionnés, de la conception à la livraison
          </p>
          <div className="home-cta-visual__actions">
            <Link to="/catalog" className="btn btn-primary btn-lg">
              Voir le catalogue
            </Link>
            {!isAuthenticated() && (
              <Link to="/register" className="btn btn-secondary btn-lg">
                Créer un compte
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
