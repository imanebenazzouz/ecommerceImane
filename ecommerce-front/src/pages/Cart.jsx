// ============================================================
// PAGE CART (Panier d'achat)
// ============================================================
//
// Cette page affiche le panier de l'utilisateur et permet de :
// - Voir tous les articles ajoutés au panier
// - Modifier les quantités (incrémenter/décrémenter)
// - Retirer des articles
// - Vider complètement le panier
// - Passer commande (checkout)
// - Payer la commande
//
// FONCTIONNALITÉS AVANCÉES :
// - Gestion du panier serveur (utilisateur connecté)
// - Gestion du panier local (utilisateur non connecté)
// - Fallback automatique sur panier local en cas d'erreur serveur
// - Synchronisation des données en temps réel
// - Modal de paiement intégré
// - Validation du stock avant checkout
// ============================================================

// ========== IMPORTS ==========
import React, { useEffect, useMemo, useState } from "react"; // React : bibliothèque UI
                                                              // useEffect : effets de bord (chargement données)
                                                              // useMemo : optimisation calculs (éviter recalculs inutiles)
                                                              // useState : gestion d'état
import { useNavigate } from "react-router-dom";               // useNavigate : navigation programmée (redirection)
import { api } from "../lib/api";                             // api : client HTTP pour le backend
import { useAuth } from "../hooks/useAuth";                   // useAuth : hook d'authentification
import PaymentModal from "../components/PaymentModal";        // PaymentModal : composant modal de paiement

// ========== COMPOSANT PRINCIPAL ==========
/**
 * Composant Cart - Gère l'affichage et les actions du panier
 * 
 * Ce composant centralise toute la logique du panier :
 * - Affichage des articles
 * - Modification des quantités
 * - Calcul du total
 * - Checkout (création de commande)
 * - Paiement
 * 
 * @returns {JSX.Element} La page du panier
 */
export default function Cart() {
  // ===== HOOKS ET ÉTATS =====
  
  // isAuthenticated : fonction pour vérifier si l'utilisateur est connecté
  // authLoading : true pendant la vérification initiale de l'authentification
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  // navigate : fonction pour rediriger l'utilisateur vers une autre page
  // Exemple : navigate('/orders') → redirige vers la page des commandes
  const navigate = useNavigate();
  
  // cart : objet contenant les données du panier { items: {...}, total: ... }
  // Initialisé à null (aucun panier chargé)
  const [cart, setCart] = useState(null);
  
  // products : liste de tous les produits disponibles (pour afficher nom, prix, etc.)
  // Nécessaire car le panier ne contient que les IDs produits et quantités
  const [products, setProducts] = useState([]);
  
  // orderId : ID de la commande créée après checkout (pour le paiement)
  // null = pas de commande en cours
  const [orderId, setOrderId] = useState(null);
  
  // err : message d'erreur à afficher (ex: "Stock insuffisant")
  const [err, setErr] = useState("");
  
  // msg : message de succès à afficher (ex: "Panier vidé")
  const [msg, setMsg] = useState("");
  
  // pending : true pendant les opérations asynchrones (chargement, mise à jour)
  // Permet d'afficher un indicateur de chargement
  const [pending, setPending] = useState(false);
  
  // showPaymentModal : true pour afficher la modal de paiement
  // false pour la masquer
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // ===== CHARGEMENT INITIAL DU PANIER =====
  /**
   * useEffect : s'exécute au montage du composant et quand isAuthenticated change
   * 
   * Logique :
   * 1. Attendre que l'authentification soit chargée
   * 2. Charger la liste des produits (pour afficher nom, prix, stock)
   * 3. Charger le panier :
   *    - Si connecté → panier serveur (via API)
   *    - Si non connecté → panier local (localStorage)
   *    - En cas d'erreur → fallback sur panier local
   */
  useEffect(() => {
    // Attendre que l'authentification soit complètement chargée
    // Évite les appels API inutiles pendant la vérification initiale
    if (authLoading) {
      return;
    }

    // Fonction asynchrone immédiatement invoquée
    (async () => {
      try {
        setErr("");       // Réinitialiser les messages d'erreur
        setPending(true); // Afficher l'indicateur de chargement
        
        // Étape 1 : Charger la liste complète des produits
        // Nécessaire pour afficher nom, prix, stock de chaque article du panier
        const ps = await api.listProducts();
        setProducts(ps);

        // Étape 2 : Charger le panier selon l'état de connexion
        if (isAuthenticated()) {
          // ===== UTILISATEUR CONNECTÉ =====
          // Essayer de récupérer le panier depuis le serveur
          try {
            const c = await api.getCart(); // GET /cart → panier serveur
            setCart(c);
          } catch (cartError) {
            // En cas d'erreur, fallback automatique sur le panier local
            console.warn('Erreur chargement panier serveur:', cartError);
            
            if (cartError.status === 401) {
              // Session expirée → panier local
              const localCart = getLocalCart();
              setCart(localCart);
              setErr("Session expirée, utilisation du panier local");
            } else {
              // Autre erreur (serveur indisponible, etc.) → panier local
              const localCart = getLocalCart();
              setCart(localCart);
              setErr(`Erreur serveur: ${cartError.message}. Utilisation du panier local.`);
            }
          }
        } else {
          // ===== UTILISATEUR NON CONNECTÉ =====
          // Utiliser directement le panier local (localStorage)
          const localCart = getLocalCart();
          setCart(localCart);
        }
      } catch (e) {
        // Erreur générale (chargement produits échoué, etc.)
        console.error('Erreur chargement général:', e);
        // Fallback : au moins afficher le panier local
        const localCart = getLocalCart();
        setCart(localCart);
        setErr(`Erreur de chargement: ${e.message}. Utilisation du panier local.`);
      } finally {
        // Toujours désactiver l'indicateur de chargement à la fin
        setPending(false);
      }
    })();
  }, [isAuthenticated, authLoading]); // Se ré-exécute si l'état de connexion change

  // ===== FONCTIONS UTILITAIRES PANIER LOCAL =====
  
  /**
   * Récupère le panier local depuis le localStorage
   * @returns {Object} Panier local { items: {...} } ou panier vide si inexistant
   */
  function getLocalCart() {
    const localCartData = localStorage.getItem('localCart');
    return localCartData ? JSON.parse(localCartData) : { items: {} };
  }

  /**
   * Sauvegarde le panier local dans le localStorage
   * @param {Object} cartData - Données du panier à sauvegarder
   */
  function saveLocalCart(cartData) {
    localStorage.setItem('localCart', JSON.stringify(cartData));
    // Déclencher un événement pour mettre à jour l'icône du panier
    window.dispatchEvent(new Event('cartUpdated'));
  }

  // ===== MAPS OPTIMISÉES (USEMEMO) =====
  // useMemo : évite de recalculer ces maps à chaque render
  // Ne recalcule que si 'products' change
  
  /**
   * Map : product_id → prix en centimes
   * Permet un accès rapide au prix d'un produit : priceById.get(id)
   */
  const priceById = useMemo(() => {
    const m = new Map();
    products.forEach((p) => {
      // Compatibilité avec différents formats d'API
      const price = p.price_cents || (p.price ? Math.round(p.price * 100) : 0);
      m.set(p.id, price);
    });
    return m;
  }, [products]);

  /**
   * Map : product_id → nom du produit
   * Permet un accès rapide au nom : nameById.get(id)
   */
  const nameById = useMemo(() => {
    const m = new Map();
    products.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [products]);

  /**
   * Map : product_id → stock disponible
   * Utilisé pour valider le panier local (hors connexion)
   */
  const stockById = useMemo(() => {
    const m = new Map();
    products.forEach((p) => m.set(p.id, p.stock_qty || p.stock || 0));
    return m;
  }, [products]);

  // Formateur de prix (ex: 1250 → "12,50 €")
  const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

  /**
   * Liste des articles du panier sous forme de tableau
   * useMemo : recalcule uniquement si 'cart' change
   */
  const items = useMemo(() => Object.values(cart?.items || {}), [cart]);

  /**
   * Calcul du total du panier en centimes
   * useMemo : recalcule uniquement si items ou priceById change
   */
  const totalCents = useMemo(() => {
    if (!cart) return 0;
    // reduce : somme de (prix unitaire * quantité) pour chaque article
    return items.reduce((sum, it) => {
      const unit = priceById.get(it.product_id) || 0;
      return sum + unit * it.quantity;
    }, 0);
  }, [items, priceById, cart]);

  // ===== FONCTION DE RECHARGEMENT DU PANIER =====
  /**
   * Recharge le panier depuis le serveur ou le localStorage
   * Appelée après chaque modification (ajout, retrait, etc.)
   */
  async function reload() {
    try {
      if (isAuthenticated()) {
        try {
          const c = await api.getCart();
          setCart(c);
          setErr(""); // Effacer les erreurs en cas de succès
        } catch (cartError) {
          // Fallback sur panier local en cas d'erreur serveur
          if (cartError.status === 401) {
            const localCart = getLocalCart();
            setCart(localCart);
            setErr("Session expirée, utilisation du panier local");
          } else {
            const localCart = getLocalCart();
            setCart(localCart);
            setErr(`Erreur serveur: ${cartError.message}. Utilisation du panier local.`);
          }
        }
      } else {
        const localCart = getLocalCart();
        setCart(localCart);
        setErr("");
      }
    } catch (e) {
      console.error('Erreur reload général:', e);
      setErr(`Erreur de rechargement: ${e.message}`);
    }
  }

  // ===== ACTIONS SUR LES ARTICLES DU PANIER =====
  
  /**
   * Incrémente la quantité d'un article (+1)
   * @param {string} product_id - ID du produit à incrémenter
   */
  async function inc(product_id) {
    setErr(""); setMsg(""); setPending(true);
    try {
      if (isAuthenticated()) {
        // Utilisateur connecté : ajouter via API
        await api.addToCart({ product_id, qty: 1 });
        await reload();
      } else {
        // Utilisateur non connecté : modifier le panier local
        const localCart = getLocalCart();
        const available = stockById.get(product_id) || 0;
        const existingQty = localCart.items[product_id]?.quantity || 0;
        if (available <= 0) {
          setErr("Rupture de stock");
        } else if (existingQty + 1 > available) {
          setErr(`Stock insuffisant. Vous avez déjà ${existingQty} dans le panier (stock: ${available}).`);
        } else {
          const existingItem = localCart.items[product_id];
          if (existingItem) {
            localCart.items[product_id].quantity = existingQty + 1;
          } else {
            localCart.items[product_id] = { product_id, quantity: 1 };
          }
          saveLocalCart(localCart);
          setCart(localCart);
        }
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setPending(false);
    }
  }

  async function dec(product_id) {
    setErr(""); setMsg(""); setPending(true);
    try {
      if (isAuthenticated()) {
        await api.removeFromCart({ product_id, qty: 1 });
        await reload();
      } else {
        // Gestion du panier local
        const localCart = getLocalCart();
        const existingItem = localCart.items[product_id];
        if (existingItem && existingItem.quantity > 1) {
          localCart.items[product_id].quantity -= 1;
          saveLocalCart(localCart);
          setCart(localCart);
        }
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setPending(false);
    }
  }

  async function removeAll(product_id) {
    setErr(""); setMsg(""); setPending(true);
    try {
      if (isAuthenticated()) {
        // qty: 0 = supprimer l'article entièrement (supporté par ton API)
        await api.removeFromCart({ product_id, qty: 0 });
        await reload();
      } else {
        // Gestion du panier local
        const localCart = getLocalCart();
        delete localCart.items[product_id];
        saveLocalCart(localCart);
        setCart(localCart);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setPending(false);
    }
  }

  // --- Actions globales ---
  async function clearCart() {
    if (items.length === 0) return;
    setErr(""); setMsg(""); setPending(true);
    try {
      if (isAuthenticated()) {
        // supprime chaque article (qty=0) en parallèle
        await Promise.all(items.map(it => api.removeFromCart({ product_id: it.product_id, qty: 0 })));
        await reload();
      } else {
        // Gestion du panier local
        const emptyCart = { items: {} };
        saveLocalCart(emptyCart);
        setCart(emptyCart);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setPending(false);
    }
  }

  async function checkout() {
    // Protection contre les doubles clics - mettre pending IMMÉDIATEMENT
    if (pending) return; // Si déjà en cours, ignorer le clic
    
    setErr(""); setMsg("");
    setPending(true); // Mettre pending AVANT toute autre opération
    
    try {
      // Vérification d'authentification avant le paiement
      if (!isAuthenticated()) {
        setPending(false);
        // Redirection vers login avec paramètre de retour
        navigate("/login?next=/cart");
        return;
      }

      const res = await api.checkout();
      setOrderId(res.order_id);
      setShowPaymentModal(true);
      setMsg("Commande créée avec succès !");
    } catch (e) {
      setErr(e.message);
    } finally {
      setPending(false);
    }
  }

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setMsg("Paiement réussi ! Redirection vers vos commandes...");
    
    // Redirection vers les commandes après un délai
    setTimeout(() => {
      navigate("/orders");
    }, 2000);
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setOrderId(null);
    setMsg("Paiement annulé. Votre commande reste en attente.");
  };

  // Afficher le chargement pendant l'initialisation de l'authentification
  if (authLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ 
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }}></div>
        <p>Initialisation de votre session...</p>
      </div>
    );
  }

  if (!cart && !err) return <p style={{ padding: 40 }}>Chargement…</p>;

  return (
    <div style={{ padding: 40 }}>
      <h2>Mon panier</h2>
      {err && <p style={{ color: "tomato", fontWeight: 600 }}>{err}</p>}
      {msg && <p style={{ color: "green", fontWeight: 600 }}>{msg}</p>}
      
      {/* Message d'information pour les utilisateurs non connectés */}
      {!isAuthenticated() && items.length > 0 && (
        <div style={{ 
          backgroundColor: "#f0f9ff", 
          border: "1px solid #0ea5e9", 
          borderRadius: 8, 
          padding: 16, 
          marginBottom: 20 
        }}>
          <p style={{ margin: 0, color: "#0c4a6e", fontWeight: 600 }}>
            Vous n'êtes pas connecté
          </p>
          <p style={{ margin: "8px 0 0 0", color: "#0c4a6e", fontSize: 14 }}>
            Vous pouvez modifier votre panier, mais vous devrez vous connecter ou créer un compte pour passer commande.
          </p>
        </div>
      )}

      {/* Message d'information pour les erreurs de serveur */}
      {isAuthenticated() && err && err.includes("Erreur serveur") && (
        <div style={{ 
          backgroundColor: "#fef3c7", 
          border: "1px solid #f59e0b", 
          borderRadius: 8, 
          padding: 16, 
          marginBottom: 20 
        }}>
          <p style={{ margin: 0, color: "#92400e", fontWeight: 600 }}>
            Problème de connexion au serveur
          </p>
          <p style={{ margin: "8px 0 0 0", color: "#92400e", fontSize: 14 }}>
            Votre panier local est affiché. Les modifications seront synchronisées dès que la connexion sera rétablie.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <p>Panier vide.</p>
      ) : (
        <>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, maxWidth: 680 }}>
            {items.map((it) => {
              const name = nameById.get(it.product_id) || it.product_id;
              const unit = priceById.get(it.product_id) || 0;
              const line = unit * it.quantity;
              return (
                <li
                  key={it.product_id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{name}</div>
                    <div style={{ color: "#64748b", fontSize: 14 }}>
                      {unit > 0 ? fmt.format(unit / 100) : "Prix non disponible"} / unité
                    </div>
                  </div>

                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => dec(it.product_id)}
                      disabled={pending || it.quantity <= 1}
                      title="Retirer 1"
                      style={btn}
                    >
                      −
                    </button>
                    <span style={{ minWidth: 28, textAlign: "center", fontWeight: 700 }}>
                      {it.quantity}
                    </span>
                    <button
                      onClick={() => inc(it.product_id)}
                      disabled={pending}
                      title="Ajouter 1"
                      style={btn}
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeAll(it.product_id)}
                      disabled={pending}
                      title="Supprimer l’article"
                      style={btnDanger}
                    >
                      Retirer
                    </button>
                  </div>

                  <div style={{ fontWeight: 700 }}>
                    {line > 0 ? fmt.format(line / 100) : "Prix non disponible"}
                  </div>
                </li>
              );
            })}
          </ul>

          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
            <p style={{ margin: 0 }}>
              Total : <strong>{totalCents > 0 ? fmt.format(totalCents / 100) : "0,00 €"}</strong>
            </p>
            <button onClick={clearCart} disabled={pending} style={btnLight}>
              Vider le panier
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            {isAuthenticated() ? (
              <button
                onClick={checkout}
                disabled={pending}
                style={{ ...btnPrimary }}
              >
                {pending ? "Création de la commande..." : "Passer au paiement"}
              </button>
            ) : (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={checkout}
                  disabled={pending}
                  style={{ 
                    ...btnPrimary, 
                    backgroundColor: "#dc2626",
                    opacity: 0.8
                  }}
                  title="Vous devez être connecté pour passer commande"
                >
                  🔒 Connexion requise pour le paiement
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <a 
                    href="/login" 
                    style={{ 
                      ...btnPrimary, 
                      backgroundColor: "#059669",
                      textDecoration: "none",
                      display: "inline-block"
                    }}
                  >
                    Se connecter
                  </a>
                  <a 
                    href="/register" 
                    style={{ 
                      ...btnPrimary, 
                      backgroundColor: "#7c3aed",
                      textDecoration: "none",
                      display: "inline-block"
                    }}
                  >
                    Créer un compte
                  </a>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de paiement */}
      {orderId && (
        <PaymentModal
          orderId={orderId}
          amountCents={totalCents}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          isOpen={showPaymentModal}
        />
      )}
    </div>
  );
}

const btn = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  color: "#2563eb", // Bleu pour le texte
  fontWeight: 700,
  fontSize: "16px",
};

const btnLight = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  color: "#1f2937", // Noir/gris foncé pour le texte
  fontWeight: 600,
};

const btnPrimary = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const btnDanger = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
};

// Animation pour le spinner
const spinKeyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Injecter les styles si pas déjà présents
if (!document.getElementById('cart-spinner-styles')) {
  const style = document.createElement('style');
  style.id = 'cart-spinner-styles';
  style.textContent = spinKeyframes;
  document.head.appendChild(style);
}