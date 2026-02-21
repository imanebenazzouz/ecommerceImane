// ============================================================
// PAGE PRODUCT DETAIL (Détail d'un produit)
// ============================================================
// 
// Cette page affiche les détails complets d'un produit avec un design moderne
// inspiré des sites e-commerce de cosmétiques.
//
// FONCTIONNALITÉS :
// - Affichage des images (grande image + miniatures)
// - Informations produit avec accordéons
// - Prix, stock, description
// - Bouton pour ajouter au panier
// ============================================================

// ========== IMPORTS ==========
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, getImageUrl } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import "../styles/global.css";

// ========== COMPOSANT ACCORDÉON ==========
function AccordionItem({ title, icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="product-accordion-item">
      <button
        className="product-accordion-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="product-accordion-title">
          {icon && <span className="product-accordion-icon">{icon}</span>}
          {title}
        </span>
        <span className="product-accordion-toggle">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && (
        <div className="product-accordion-content">
          {children}
        </div>
      )}
    </div>
  );
}

// ========== COMPOSANT PRINCIPAL ==========
export default function ProductDetail() {
  const { productId } = useParams();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);

  // Chargement du produit
  useEffect(() => {
    (async () => {
      try {
        setError("");
        setLoading(true);
        const data = await api.getProduct(productId);
        setProduct(data);
      } catch (e) {
        console.error('Erreur chargement produit:', e);
        if (e.status === 404) {
          setError("Produit introuvable");
        } else {
          setError(`Erreur de chargement: ${e.message}`);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [productId]);

  // Fonction d'ajout au panier
  async function addToCart() {
    setMsg("");
    setErr("");
    
    try {
      if (isAuthenticated()) {
        await api.addToCart({ product_id: product.id, qty: 1 });
        
        // Déclencher un événement pour mettre à jour l'icône du panier
        window.dispatchEvent(new Event('cartUpdated'));
        
        setMsg(`${product.name} ajouté au panier`);
      } else {
        const localCartData = localStorage.getItem('localCart');
        const localCart = localCartData ? JSON.parse(localCartData) : { items: {} };
        
        const available = product.stock_qty || product.stock || 0;
        const existingQty = localCart.items[product.id]?.quantity || 0;
        
        if (available <= 0) {
          setErr("Produit indisponible");
          return;
        }
        
        if (existingQty + 1 > available) {
          setErr(`Stock insuffisant. Vous avez déjà ${existingQty} dans le panier (stock: ${available}).`);
          return;
        }
        
        if (localCart.items[product.id]) {
          localCart.items[product.id].quantity = existingQty + 1;
        } else {
          localCart.items[product.id] = { product_id: product.id, quantity: 1 };
        }
        
        localStorage.setItem('localCart', JSON.stringify(localCart));
        
        // Déclencher un événement pour mettre à jour l'icône du panier
        window.dispatchEvent(new Event('cartUpdated'));
        
        setMsg(`${product.name} ajouté au panier`);
      }
    } catch (e) {
      if (e.message.startsWith("HTTP 401")) {
        setErr("Erreur de connexion. Vérifiez votre authentification.");
      } else {
        setErr(e.message);
      }
    }
  }

  const fmt = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Chargement du produit...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <h2 className="empty-state-title">Erreur</h2>
        <p className="empty-state-description">{error || "Produit introuvable"}</p>
        <Link to="/catalog" className="btn btn-primary">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  const price = product.price_cents || (product.price ? Math.round(product.price * 100) : 0);
  const stock = product.stock_qty || product.stock || 0;
  const isAvailable = product.active && stock > 0;

  // Utiliser l'image du produit si elle existe
  const mainImageUrl = product.image_url ? getImageUrl(product.image_url) : null;

  return (
    <div className="product-detail-page">
      <div className="product-detail-container">
        <Link to="/catalog" className="product-detail-back">
          ← Retour au catalogue
        </Link>

        <div className="product-detail-layout">
          {/* ===== COLONNE GAUCHE : IMAGES ===== */}
          <div className="product-detail-images">
            {/* Miniatures - Afficher uniquement si on a une image */}
            {mainImageUrl && (
              <div className="product-detail-thumbnails">
                <button
                  className="product-detail-thumbnail active"
                  onClick={() => setSelectedImage(0)}
                  aria-label="Voir l'image"
                >
                  <img 
                    src={mainImageUrl} 
                    alt={product.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentElement.innerHTML = '<div class="product-detail-thumbnail-placeholder">📦</div>';
                    }}
                  />
                </button>
              </div>
            )}

            {/* Image principale */}
            <div className="product-detail-main-image">
              {mainImageUrl ? (
                <img 
                  src={mainImageUrl} 
                  alt={product.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    backgroundColor: "#f9fafb"
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.innerHTML = '<div class="product-detail-main-image-placeholder">Image principale</div>';
                  }}
                />
              ) : (
                <div className="product-detail-main-image-placeholder">
                  Image principale
                </div>
              )}
            </div>
          </div>

          {/* ===== COLONNE DROITE : INFORMATIONS ===== */}
          <div className="product-detail-info-column">
            {/* Avis (placeholder) */}
            <div className="product-detail-rating">
              <span className="product-detail-stars">★★★★★</span>
              <span className="product-detail-reviews">(Pas d'avis)</span>
            </div>

            {/* Titre du produit */}
            <h1 className="product-detail-title-main">
              {product.name}
            </h1>

            {/* Prix */}
            <div className="product-detail-pricing">
              <div className="product-detail-price-wrapper">
                <span className="product-detail-price-old">
                  {price > 0 ? fmt.format((price * 1.4) / 100) : ""}
                </span>
                <span className="product-detail-price-current">
                  {price > 0 ? fmt.format(price / 100) : "Prix non disponible"}
                </span>
                {price > 0 && (
                  <span className="product-detail-discount-badge">
                    -28%
                  </span>
                )}
              </div>
              <p className="product-detail-tax-info">Taxes incluses.</p>
            </div>

            {/* Disponibilité */}
            <div className="product-detail-availability">
              <div className={`product-detail-stock-indicator ${isAvailable ? (stock < 5 ? 'low-stock' : 'in-stock') : 'out-of-stock'}`}>
                <span className="product-detail-stock-dot"></span>
                <span className="product-detail-stock-text">
                  {isAvailable ? (
                    stock < 5 ? `Stock\u00a0: Faible (${stock})` : `Stock\u00a0: ${stock}`
                  ) : "Rupture de stock"}
                </span>
              </div>
            </div>

            {/* Messages */}
            {msg && <div className="message message-success">{msg}</div>}
            {err && <div className="message message-error">{err}</div>}

            {/* Bouton d'action */}
            <div className="product-detail-actions">
              <button
                onClick={addToCart}
                disabled={!isAvailable}
                className={`btn btn-product-add ${!isAvailable ? 'btn-disabled' : ''}`}
              >
                {isAvailable ? "Ajouter au panier" : "ÉPUISÉ"}
              </button>
            </div>

            {/* Accordéons d'informations */}
            <div className="product-detail-accordions">
              <AccordionItem title="DESCRIPTION" icon="👁️" defaultOpen={true}>
                <div className="product-accordion-text">
                  {product.description || "Aucune description disponible pour ce produit."}
                </div>
              </AccordionItem>

              <AccordionItem title="CARACTÉRISTIQUES" icon="✓">
                <div className="product-accordion-text">
                  <ul>
                    <li>Produit de qualité</li>
                    <li>Livraison rapide</li>
                    <li>Garantie satisfait ou remboursé</li>
                  </ul>
                </div>
              </AccordionItem>

              <AccordionItem title="CONSEILS D'UTILISATION" icon="❤️">
                <div className="product-accordion-text">
                  <p>Suivez les instructions d'utilisation pour une expérience optimale.</p>
                </div>
              </AccordionItem>

              <AccordionItem title="ENGAGEMENTS" icon="🌿">
                <div className="product-accordion-text">
                  <p>Nous nous engageons à vous offrir des produits de qualité avec un service client de premier plan.</p>
                </div>
              </AccordionItem>

              <AccordionItem title="COMPOSITION" icon="📦">
                <div className="product-accordion-text">
                  <p>Composition disponible sur demande. Contactez notre service client pour plus d'informations.</p>
                </div>
              </AccordionItem>
            </div>

            {/* Partage social */}
            <div className="product-detail-share">
              <span className="product-detail-share-title">PARTAGEZ</span>
              <div className="product-detail-share-icons">
                <span className="product-share-icon">f</span>
                <span className="product-share-icon">X</span>
                <span className="product-share-icon">P</span>
                <span className="product-share-icon">✉</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
