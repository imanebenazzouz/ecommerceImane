// src/pages/Login.jsx
//
// Page de connexion: authentifie l'utilisateur et synchronise le panier local.
import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function isEmail(x) {
    return /\S+@\S+\.\S+/.test(x);
  }

  // Fonction pour synchroniser le panier local avec le serveur
  async function syncLocalCartToServer() {
    try {
      const localCartData = localStorage.getItem('localCart');
      if (localCartData) {
        const localCart = JSON.parse(localCartData);
        const items = Object.values(localCart.items || {});
        
        if (items.length > 0) {
          console.log(`Synchronisation de ${items.length} articles du panier local...`);
          
          // Garder trace des articles qui n'ont pas pu être synchronisés
          const failedItems = {};
          let successCount = 0;
          
          // Ajouter chaque article du panier local au panier serveur
          for (const item of items) {
            try {
              await api.addToCart({ product_id: item.product_id, qty: item.quantity });
              console.log(`Article ${item.product_id} (qty: ${item.quantity}) synchronisé`);
              successCount++;
            } catch (itemError) {
              console.warn(`Erreur pour l'article ${item.product_id}:`, itemError);
              // Garder l'article dans le panier local s'il n'a pas pu être synchronisé
              failedItems[item.product_id] = item;
            }
          }
          
          // Si tous les articles ont été synchronisés, vider le panier local
          if (successCount === items.length) {
            localStorage.removeItem('localCart');
            console.log('Panier local synchronisé et vidé');
          } else {
            // Sinon, garder seulement les articles qui ont échoué
            const remainingCart = { items: failedItems };
            localStorage.setItem('localCart', JSON.stringify(remainingCart));
            console.log(`${items.length - successCount} article(s) n'ont pas pu être synchronisés (stock insuffisant ou produit indisponible)`);
          }
        }
      }
    } catch (error) {
      console.warn("Erreur lors de la synchronisation du panier:", error);
      // Ne pas bloquer la connexion si la synchronisation échoue
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isEmail(email)) return setError("Format d'email invalide");
    if (!pwd) return setError("Mot de passe obligatoire");

    setError("");
    setPending(true);

    try {
      // Connexion + récupération du rôle
      const { token, user } = await api.login({ email, password: pwd });

      // Utiliser le contexte d'authentification
      await login(user, token);
      
      // Sauvegarde du rôle
      localStorage.setItem("role", user?.is_admin ? "admin" : "user");

      // Synchroniser le panier local avec le serveur
      await syncLocalCartToServer();

      // Redirection vers la page demandée ou l'accueil
      const nextUrl = searchParams.get('next') || "/";
      navigate(nextUrl);
    } catch (err) {
      console.error("Erreur login:", err);
      let errorMessage = "Erreur de connexion, veuillez réessayer.";
      if (err?.message) errorMessage = err.message;
      else if (typeof err === "string") errorMessage = err;
      else if (err?.toString) errorMessage = err.toString();
      setError(errorMessage);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-grid">
          <div className="auth-card auth-card--frosted">
            <h2>Se connecter</h2>

            {error && <div className="message message-error">{error}</div>}

            <form onSubmit={handleSubmit} noValidate className="auth-form">
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: imane@example.com"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="••••••••"
                  className="form-input"
                />
              </div>

              <div className="auth-actions">
                <button type="submit" className="btn btn-rose btn-lg" disabled={pending}>
                  {pending ? "Connexion…" : "Se connecter"}
                </button>
                <Link to="/register" className="btn btn-rose btn-lg auth-actions__secondary">
                  S&apos;inscrire
                </Link>
              </div>

              <div className="auth-links">
                <Link to="/reset-password-simple" className="auth-link">
                  Mot de passe oublié ?
                </Link>
              </div>
            </form>
          </div>

          <div className="auth-note">
            <div className="auth-note__title">🧪 Comptes de test</div>
            <ul className="auth-note__list">
              <li className="auth-note__item">
                <strong>Admin</strong> — admin@example.com / admin
              </li>
              <li className="auth-note__item">
                <strong>Client</strong> — client@example.com / secret
              </li>
              <li className="auth-note__item">
                <strong>Astuce</strong> — la synchro du panier se fait dès la connexion.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
