// src/components/UserMenu.jsx
//
// Icône utilisateur dans le header - redirige vers le profil

import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "../styles/global.css";

/**
 * Composant UserMenu - Icône cliquable qui redirige vers le profil
 * @returns {JSX.Element}
 */
export default function UserMenu() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Si non connecté, rediriger vers la page de connexion
  if (!authLoading && !isAuthenticated()) {
    return (
      <Link to="/login" className="app-header-main__user-icon" aria-label="Se connecter">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M6 21c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      </Link>
    );
  }

  // Si connecté, rediriger vers le profil
  return (
    <Link to="/profile" className="app-header-main__user-icon" aria-label="Mon profil">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M6 21c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="2" fill="none"/>
      </svg>
    </Link>
  );
}
