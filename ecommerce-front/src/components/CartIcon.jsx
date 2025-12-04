// src/components/CartIcon.jsx
//
// Icône de panier affichée dans le header avec le nombre d'items

import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import "../styles/global.css";

/**
 * Composant CartIcon - Affiche une icône de panier avec le nombre d'items
 * @param {Function} onOpen - Fonction appelée quand on clique sur l'icône pour ouvrir le menu
 * @returns {JSX.Element}
 */
export default function CartIcon({ onOpen }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fonction pour calculer le nombre d'items dans le panier local
  function getLocalCartCount() {
    try {
      const localCartData = localStorage.getItem('localCart');
      if (!localCartData) return 0;
      const localCart = JSON.parse(localCartData);
      const items = localCart.items || {};
      // Somme de toutes les quantités
      return Object.values(items).reduce((sum, item) => sum + (item.quantity || 0), 0);
    } catch (e) {
      console.error('Erreur lecture panier local:', e);
      return 0;
    }
  }

  // Fonction pour charger le nombre d'items
  async function loadCartCount() {
    try {
      setLoading(true);
      
      if (isAuthenticated()) {
        // Utilisateur connecté : récupérer le panier serveur
        try {
          const cart = await api.getCart();
          const items = cart?.items || {};
          const count = Object.values(items).reduce((sum, item) => sum + (item.quantity || 0), 0);
          setCartCount(count);
        } catch (e) {
          // En cas d'erreur, utiliser le panier local
          console.warn('Erreur chargement panier serveur:', e);
          const localCount = getLocalCartCount();
          setCartCount(localCount);
        }
      } else {
        // Utilisateur non connecté : utiliser le panier local
        const localCount = getLocalCartCount();
        setCartCount(localCount);
      }
    } catch (e) {
      console.error('Erreur chargement panier:', e);
      setCartCount(0);
    } finally {
      setLoading(false);
    }
  }

  // Charger le nombre d'items dans le panier
  useEffect(() => {
    if (authLoading) {
      return;
    }

    loadCartCount();

    // Fonction pour gérer les mises à jour du panier
    const handleCartUpdate = () => {
      if (!isAuthenticated()) {
        // Panier local : mettre à jour immédiatement
        const localCount = getLocalCartCount();
        setCartCount(localCount);
      } else {
        // Panier serveur : recharger immédiatement
        loadCartCount();
      }
    };

    // Écouter les événements personnalisés de mise à jour du panier
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    // Écouter les changements dans le localStorage (pour les autres onglets)
    const handleStorageChange = (e) => {
      if (e.key === 'localCart' && !isAuthenticated()) {
        const localCount = getLocalCartCount();
        setCartCount(localCount);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Vérifier périodiquement les changements du panier (toutes les 2 secondes pour les utilisateurs connectés)
    const checkInterval = setInterval(() => {
      if (!isAuthenticated()) {
        const localCount = getLocalCartCount();
        if (localCount !== cartCount) {
          setCartCount(localCount);
        }
      } else {
        // Pour les utilisateurs connectés, vérifier périodiquement le panier serveur
        loadCartCount();
      }
    }, 2000); // Vérifier toutes les 2 secondes

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkInterval);
    };
  }, [isAuthenticated, authLoading]);

  return (
    <button 
      onClick={onOpen}
      className="cart-icon"
      aria-label="Ouvrir le panier"
    >
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <path 
          d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.3 15.7 4.6 16.5 5.1 16.5H17M17 13V17C17 18.1 17.9 19 19 19C20.1 19 21 18.1 21 17V13M9 19.5C9.8 19.5 10.5 20.2 10.5 21C10.5 21.8 9.8 22.5 9 22.5C8.2 22.5 7.5 21.8 7.5 21C7.5 20.2 8.2 19.5 9 19.5ZM20 19.5C20.8 19.5 21.5 20.2 21.5 21C21.5 21.8 20.8 22.5 20 22.5C19.2 22.5 18.5 21.8 18.5 21C18.5 20.2 19.2 19.5 20 19.5Z" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
      {!loading && cartCount > 0 && (
        <span className="cart-icon__badge">{cartCount}</span>
      )}
    </button>
  );
}
