// src/components/UserMenu.jsx
//
// Menu utilisateur affiché au clic sur l'icône profil dans le header

import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { setToken as apiSetToken } from "../lib/api";
import "../styles/global.css";

/**
 * Composant UserMenu - Affiche un menu déroulant avec les options utilisateur
 * @returns {JSX.Element}
 */
export default function UserMenu() {
  const { isAuthenticated, user, logout, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Fermer le menu quand on clique en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Fermer le menu au changement de route
  useEffect(() => {
    setIsOpen(false);
  }, [navigate]);

  const handleLogout = () => {
    try {
      apiSetToken?.(null);
    } catch {
      // Ignore errors when clearing token
    }
    logout();
    setIsOpen(false);
    navigate("/");
  };

  // Si non connecté, rediriger vers la page de connexion
  if (!authLoading && !isAuthenticated()) {
    return (
      <Link to="/login" className="app-header-main__user-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M6 21c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      </Link>
    );
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="app-header-main__user-icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu utilisateur"
        aria-expanded={isOpen}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M6 21c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      </button>

      {isOpen && (
        <div className="user-menu__dropdown">
          <div className="user-menu__header">
            <div className="user-menu__email">{user?.email || "Utilisateur"}</div>
          </div>
          
          <div className="user-menu__items">
            <Link
              to="/profile"
              className="user-menu__item"
              onClick={() => setIsOpen(false)}
            >
              <span className="user-menu__icon">👤</span>
              <span>Mon profil</span>
            </Link>
            
            <Link
              to="/orders"
              className="user-menu__item"
              onClick={() => setIsOpen(false)}
            >
              <span className="user-menu__icon">📦</span>
              <span>Mes commandes</span>
            </Link>

            {userIsAdmin && (
              <Link
                to="/admin"
                className="user-menu__item"
                onClick={() => setIsOpen(false)}
              >
                <span className="user-menu__icon">⚙️</span>
                <span>Administration</span>
              </Link>
            )}

            <div className="user-menu__divider"></div>

            <button
              className="user-menu__item user-menu__item--logout"
              onClick={handleLogout}
            >
              <span className="user-menu__icon">🚪</span>
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
