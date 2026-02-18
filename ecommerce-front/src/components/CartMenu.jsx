// src/components/CartMenu.jsx
//
// Menu latéral du panier qui s'ouvre depuis le côté droit

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import "../styles/global.css";

/**
 * Composant CartMenu - Menu latéral du panier
 * @returns {JSX.Element}
 */
export default function CartMenu({ isOpen, onClose }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [products, setProducts] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const menuRef = useRef(null);

  // Fonction pour calculer le nombre d'items dans le panier local
  function getLocalCart() {
    try {
      const localCartData = localStorage.getItem('localCart');
      return localCartData ? JSON.parse(localCartData) : { items: {} };
    } catch (e) {
      console.error('Erreur lecture panier local:', e);
      return { items: {} };
    }
  }

  function saveLocalCart(cartData) {
    localStorage.setItem('localCart', JSON.stringify(cartData));
    window.dispatchEvent(new Event('cartUpdated'));
  }

  // Charger le panier
  useEffect(() => {
    if (!isOpen || authLoading) return;

    (async () => {
      try {
        setErr("");
        setPending(true);
        
        const ps = await api.listProducts();
        setProducts(ps);

        if (isAuthenticated()) {
          try {
            const c = await api.getCart();
            setCart(c);
          } catch (cartError) {
            console.warn('Erreur chargement panier serveur:', cartError);
            const localCart = getLocalCart();
            setCart(localCart);
            if (cartError.status === 401) {
              setErr("Session expirée, utilisation du panier local");
            } else {
              setErr(`Erreur serveur: ${cartError.message}. Utilisation du panier local.`);
            }
          }
        } else {
          const localCart = getLocalCart();
          setCart(localCart);
        }
      } catch (e) {
        console.error('Erreur chargement général:', e);
        const localCart = getLocalCart();
        setCart(localCart);
        setErr(`Erreur de chargement: ${e.message}. Utilisation du panier local.`);
      } finally {
        setPending(false);
      }
    })();
  }, [isOpen, isAuthenticated, authLoading]);

  // Maps optimisées
  const priceById = useMemo(() => {
    const m = new Map();
    products.forEach((p) => {
      const price = p.price_cents || (p.price ? Math.round(p.price * 100) : 0);
      m.set(p.id, price);
    });
    return m;
  }, [products]);

  const nameById = useMemo(() => {
    const m = new Map();
    products.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [products]);

  const stockById = useMemo(() => {
    const m = new Map();
    products.forEach((p) => m.set(p.id, p.stock_qty || p.stock || 0));
    return m;
  }, [products]);

  const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  const items = useMemo(() => Object.values(cart?.items || {}), [cart]);

  const totalCents = useMemo(() => {
    if (!cart) return 0;
    return items.reduce((sum, it) => {
      const unit = priceById.get(it.product_id) || 0;
      return sum + unit * it.quantity;
    }, 0);
  }, [items, priceById, cart]);

  // Recharger le panier
  async function reload() {
    try {
      if (isAuthenticated()) {
        try {
          const c = await api.getCart();
          setCart(c);
          setErr("");
        } catch (cartError) {
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

  // Actions sur les articles
  async function inc(product_id) {
    setErr(""); setMsg(""); setPending(true);
    try {
      if (isAuthenticated()) {
        await api.addToCart({ product_id, qty: 1 });
        await reload();
      } else {
        const localCart = getLocalCart();
        const available = stockById.get(product_id) || 0;
        const existingQty = localCart.items[product_id]?.quantity || 0;
        if (available <= 0) {
          setErr("Rupture de stock");
        } else if (existingQty + 1 > available) {
          setErr(`Stock insuffisant. Vous avez déjà ${existingQty} dans le panier (stock: ${available}).`);
        } else {
          if (localCart.items[product_id]) {
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
        await api.removeFromCart({ product_id, qty: 0 });
        await reload();
      } else {
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

  async function clearCart() {
    if (items.length === 0) return;
    setErr(""); setMsg(""); setPending(true);
    try {
      if (isAuthenticated()) {
        await Promise.all(items.map(it => api.removeFromCart({ product_id: it.product_id, qty: 0 })));
        await reload();
      } else {
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
      if (!isAuthenticated()) {
        onClose();
        navigate("/login?next=/cart");
        return;
      }

      // 1) Créer la commande côté backend
      const res = await api.checkout();

      // 2) Créer une session Stripe Checkout pour cette commande
      const { url } = await api.createCheckoutSession(res.order_id);

      // 3) Fermer le menu et rediriger vers Stripe
      if (url) {
        onClose();
        window.location.href = url;
        return;
      }

      setErr("Impossible de créer la session de paiement Stripe.");
    } catch (e) {
      setErr(e.message || "Erreur lors de la création de la commande ou de la session Stripe.");
    } finally {
      // Toujours réinitialiser pending dans finally pour éviter les blocages
      setPending(false);
    }
  };

  // Empêcher le scroll du body quand le menu est ouvert
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


  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="cart-menu-backdrop"
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Menu latéral */}
      <div className={`cart-menu ${isOpen ? "cart-menu--open" : ""}`} ref={menuRef}>
        <div className="cart-menu__header">
          <h2 className="cart-menu__title">Mon panier</h2>
          <button
            className="cart-menu__close"
            onClick={onClose}
            aria-label="Fermer le panier"
          >
            ✕
          </button>
        </div>

        <div className="cart-menu__content">
          {err && <div className="cart-menu__alert cart-menu__alert--error">{err}</div>}
          {msg && <div className="cart-menu__alert cart-menu__alert--success">{msg}</div>}

          {pending && !cart && (
            <div className="cart-menu__loading">Chargement...</div>
          )}

          {!pending && cart && items.length === 0 && (
            <div className="cart-menu__empty">
              <p>Votre panier est vide</p>
            </div>
          )}

          {!pending && cart && items.length > 0 && (
            <>
              {!isAuthenticated() && (
                <div className="cart-menu__info">
                  <p>Vous n'êtes pas connecté. Connectez-vous pour passer commande.</p>
                </div>
              )}

              <div className="cart-menu__items">
                {items.map((it) => {
                  const name = nameById.get(it.product_id) || it.product_id;
                  const unit = priceById.get(it.product_id) || 0;
                  const line = unit * it.quantity;
                  const product = products.find(p => p.id === it.product_id);
                  
                  return (
                    <div key={it.product_id} className="cart-menu__item">
                      {product?.image_url && (
                        <div className="cart-menu__item-image">
                          <img 
                            src={product.image_url.startsWith("http") 
                              ? product.image_url 
                              : `${import.meta.env.VITE_API_BASE || "http://localhost:8000"}${product.image_url}`}
                            alt={name}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      <div className="cart-menu__item-details">
                        <div className="cart-menu__item-name">{name}</div>
                        <div className="cart-menu__item-price">
                          {unit > 0 ? fmt.format(unit / 100) : "Prix non disponible"} / unité
                        </div>
                        <div className="cart-menu__item-actions">
                          <button
                            onClick={() => dec(it.product_id)}
                            disabled={pending || it.quantity <= 1}
                            className="cart-menu__qty-btn"
                            title="Retirer 1"
                          >
                            −
                          </button>
                          <span className="cart-menu__qty-value">{it.quantity}</span>
                          <button
                            onClick={() => inc(it.product_id)}
                            disabled={pending}
                            className="cart-menu__qty-btn"
                            title="Ajouter 1"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeAll(it.product_id)}
                            disabled={pending}
                            className="cart-menu__remove-btn"
                            title="Supprimer l'article"
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                      <div className="cart-menu__item-total">
                        {line > 0 ? fmt.format(line / 100) : "Prix non disponible"}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cart-menu__footer">
                <div className="cart-menu__total">
                  <span>Total :</span>
                  <strong>{totalCents > 0 ? fmt.format(totalCents / 100) : "0,00 €"}</strong>
                </div>
                <button 
                  onClick={clearCart} 
                  disabled={pending} 
                  className="cart-menu__clear-btn"
                >
                  Vider le panier
                </button>
                <button
                  onClick={checkout}
                  disabled={pending || items.length === 0}
                  className="cart-menu__checkout-btn"
                >
                  {pending ? "Traitement..." : "Passer au paiement"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
