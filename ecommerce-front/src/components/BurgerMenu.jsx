// ============================================================
// COMPOSANT BURGER MENU
// ============================================================
// 
// Menu burger responsive avec animation d'ouverture/fermeture
// Affiche tous les liens de navigation dans un menu latéral
//
// FONCTIONNALITÉS :
// - Bouton burger avec animation (3 lignes → X)
// - Menu latéral qui slide depuis la gauche
// - Fermeture au clic sur un lien ou sur le backdrop
// - Gestion de l'authentification et des rôles
// ============================================================

// ========== IMPORTS ==========
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { setToken as apiSetToken } from "../lib/api";

// ========== COMPOSANT PRINCIPAL ==========
/**
 * Composant BurgerMenu - Menu de navigation burger
 * 
 * @returns {JSX.Element} Le menu burger avec tous les liens de navigation
 */
export default function BurgerMenu() {
  const { isAuthenticated, logout, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState(() => localStorage.getItem("role"));

  // Synchronise le rôle quand l'utilisateur change
  useEffect(() => {
    if (user) {
      const userRole = user.is_admin ? "admin" : "user";
      localStorage.setItem("role", userRole);
      setRole(userRole);
    } else {
      localStorage.removeItem("role");
      setRole(null);
    }
  }, [user]);

  // Ferme le menu quand on change de page
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Empêche le scroll du body quand le menu est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const isAuth = isAuthenticated();

  // Gestion de la déconnexion
  function handleLogout() {
    try {
      apiSetToken?.(null);
    } catch {
      // Ignore errors when clearing token
    }
    logout();
    setIsOpen(false);
    navigate("/");
  }

  // Toggle du menu
  function toggleMenu() {
    setIsOpen(!isOpen);
  }

  // Fermer le menu
  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <>
      {/* ===== BOUTON BURGER ===== */}
      <button
        className={`burger-button ${isOpen ? "burger-button--open" : ""}`}
        onClick={toggleMenu}
        aria-label="Ouvrir le menu"
        aria-expanded={isOpen}
      >
        <span className="burger-button__line"></span>
        <span className="burger-button__line"></span>
        <span className="burger-button__line"></span>
      </button>

      {/* ===== BACKDROP (Fond sombre) ===== */}
      {isOpen && (
        <div
          className="burger-backdrop"
          onClick={closeMenu}
          aria-hidden="true"
        ></div>
      )}

      {/* ===== MENU LATÉRAL ===== */}
      <nav
        className={`burger-menu ${isOpen ? "burger-menu--open" : ""}`}
        aria-label="Navigation principale"
      >
        <div className="burger-menu__header">
          <h2 className="burger-menu__title">Menu</h2>
          <button
            className="burger-menu__close"
            onClick={closeMenu}
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        </div>

        <div className="burger-menu__content">
          {/* ===== NAVIGATION PRINCIPALE ===== */}
          <ul className="burger-menu__list">
            <li>
              <Link
                to="/"
                className="burger-menu__link"
                onClick={closeMenu}
              >
Accueil
              </Link>
            </li>
            <li>
              <Link
                to="/catalog"
                className="burger-menu__link"
                onClick={closeMenu}
              >
Catalogue
              </Link>
            </li>
          </ul>

          {/* ===== NAVIGATION UTILISATEUR CONNECTÉ ===== */}
          {isAuth && (
            <>
              <div className="burger-menu__divider"></div>
              <ul className="burger-menu__list">
                <li>
                  <Link
                    to="/profile"
                    className="burger-menu__link"
                    onClick={closeMenu}
                  >
                    Mon profil
                  </Link>
                </li>
                <li>
                  <Link
                    to="/orders"
                    className="burger-menu__link"
                    onClick={closeMenu}
                  >
                    Mes commandes
                  </Link>
                </li>
                <li>
                  <Link
                    to="/support"
                    className="burger-menu__link"
                    onClick={closeMenu}
                  >
                    Support
                  </Link>
                </li>
              </ul>
            </>
          )}

          {/* ===== NAVIGATION ADMIN ===== */}
          {role === "admin" && (
            <>
              <div className="burger-menu__divider"></div>
              <ul className="burger-menu__list">
                <li>
                  <Link
                    to="/admin"
                    className="burger-menu__link burger-menu__link--admin"
                    onClick={closeMenu}
                  >
                    Administration
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/support"
                    className="burger-menu__link burger-menu__link--admin"
                    onClick={closeMenu}
                  >
                    Support Admin
                  </Link>
                </li>
              </ul>
            </>
          )}

          {/* ===== NAVIGATION UTILISATEUR NON CONNECTÉ ===== */}
          {!isAuth && (
            <>
              <div className="burger-menu__divider"></div>
              <ul className="burger-menu__list">
                <li>
                  <Link
                    to="/login"
                    className="burger-menu__link burger-menu__link--auth"
                    onClick={closeMenu}
                  >
                    Connexion
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="burger-menu__link burger-menu__link--auth"
                    onClick={closeMenu}
                  >
                    Inscription
                  </Link>
                </li>
              </ul>
            </>
          )}

          {/* ===== INFORMATIONS UTILISATEUR ===== */}
          {isAuth && (
            <>
              <div className="burger-menu__divider"></div>
              <div className="burger-menu__user-info">
                <p className="burger-menu__user-text">
                  Connecté en tant que{" "}
                  <strong>
                    {role === "admin" ? "Administrateur" : "Client"}
                  </strong>
                </p>
                <button
                  onClick={handleLogout}
                  className="burger-menu__logout"
                >
                  Déconnexion
                </button>
              </div>
            </>
          )}

          {/* ===== PAGES LÉGALES ===== */}
          <div className="burger-menu__divider"></div>
          <ul className="burger-menu__list burger-menu__list--legal">
            <li>
              <Link
                to="/faq"
                className="burger-menu__link burger-menu__link--small"
                onClick={closeMenu}
              >
                FAQ
              </Link>
            </li>
            <li>
              <Link
                to="/livraison"
                className="burger-menu__link burger-menu__link--small"
                onClick={closeMenu}
              >
                Livraison
              </Link>
            </li>
            <li>
              <Link
                to="/paiement-securise"
                className="burger-menu__link burger-menu__link--small"
                onClick={closeMenu}
              >
                Paiement sécurisé
              </Link>
            </li>
            <li>
              <Link
                to="/garanties"
                className="burger-menu__link burger-menu__link--small"
                onClick={closeMenu}
              >
                Garanties
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}

