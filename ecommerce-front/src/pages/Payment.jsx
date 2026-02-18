// src/pages/Payment.jsx
//
// Page dédiée pour le paiement d'une commande

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import {
  validateCardNumber,
  validateCVV,
  validateExpiryDate,
  validatePhone,
  sanitizeNumeric,
} from "../utils/validations";
import AddressAutocomplete from "../components/AddressAutocomplete";
import "../styles/global.css";

/**
 * Page de paiement - Formulaire complet pour payer une commande
 * @returns {JSX.Element}
 */
export default function Payment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // États pour les champs du formulaire
  const [cardNumber, setCardNumber] = useState("");
  const [cvv, setCvv] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [streetName, setStreetName] = useState("");
  const [addressValidated, setAddressValidated] = useState(false);

  // États pour les erreurs de validation
  const [errors, setErrors] = useState({});

  // États généraux
  const [pending, setPending] = useState(false);
  const [stripeRedirecting, setStripeRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fmt = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

  // Charger les informations de la commande
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated()) {
      navigate("/login?next=/payment/" + orderId);
      return;
    }

    async function loadOrder() {
      try {
        setLoading(true);
        const orderData = await api.getOrder(orderId);
        setOrder(orderData);

        // Vérifier si la commande est déjà payée
        if (orderData.status === "PAYEE" || orderData.status === "PAID") {
          setError("Cette commande est déjà payée.");
          setTimeout(() => {
            navigate("/orders");
          }, 2000);
          return;
        }
      } catch (err) {
        console.error("Erreur chargement commande:", err);
        if (err.status === 404) {
          setError("Commande introuvable");
        } else {
          setError("Erreur lors du chargement de la commande");
        }
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      loadOrder();
    } else {
      setError("Aucune commande spécifiée");
      setLoading(false);
    }
  }, [orderId, isAuthenticated, authLoading, navigate]);

  /**
   * Valide tous les champs avant soumission
   */
  const validateAllFields = () => {
    const newErrors = {};

    // Validation du numéro de carte (obligatoire + Luhn)
    const cardValidation = validateCardNumber(cardNumber);
    if (!cardValidation.valid) {
      newErrors.cardNumber = cardValidation.error;
    }

    // Validation du CVV (obligatoire)
    const cvvValidation = validateCVV(cvv);
    if (!cvvValidation.valid) {
      newErrors.cvv = cvvValidation.error;
    }

    // Validation de la date d'expiration (obligatoire)
    if (!expMonth || !expYear) {
      newErrors.expiry = "Date d'expiration requise.";
    } else {
      const expiryValidation = validateExpiryDate(expMonth, expYear);
      if (!expiryValidation.valid) {
        newErrors.expiry = expiryValidation.error;
      }
    }

    // Validation du téléphone (obligatoire)
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      newErrors.phone = phoneValidation.error;
    }

    // Validation de l'adresse : doit être sélectionnée depuis l'API
    if (!addressValidated || !streetNumber || !streetName || !postalCode) {
      newErrors.address = "Vous devez sélectionner une adresse depuis la recherche ci-dessus";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Valider tous les champs
    if (!validateAllFields()) {
      setError("Veuillez corriger les erreurs dans le formulaire.");
      return;
    }

    setPending(true);
    setError("");

    try {
      const result = await api.processPayment({
        orderId,
        cardNumber: sanitizeNumeric(cardNumber),
        expMonth: parseInt(expMonth, 10),
        expYear: parseInt(expYear, 10),
        cvc: sanitizeNumeric(cvv),
        postalCode: sanitizeNumeric(postalCode),
        phone: sanitizeNumeric(phone),
        streetNumber: sanitizeNumeric(streetNumber),
        streetName: streetName.trim()
      });

      if (result.status === "SUCCEEDED") {
        setSuccess(true);
        setTimeout(() => {
          navigate("/orders");
        }, 2000);
      } else {
        setError("Paiement refusé. Vérifiez votre carte bancaire.");
      }
    } catch (err) {
      if (err.status) {
        console.error(`Erreur paiement (status ${err.status}):`, err.message || "Erreur inconnue");
      } else {
        console.error("Erreur paiement:", "Erreur inconnue");
      }

      let errorMessage = "Erreur lors du paiement. Veuillez réessayer.";

      if (err.status === 402) {
        errorMessage = "Paiement refusé. Vérifiez votre carte bancaire.";
      } else if (err.status === 422) {
        errorMessage = err.message || "Données de paiement invalides.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setPending(false);
    }
  };

  // Handlers avec sanitization automatique
  const handleCardNumberChange = (e) => {
    const sanitized = sanitizeNumeric(e.target.value);
    setCardNumber(sanitized);
    if (sanitized.length >= 13) {
      const validation = validateCardNumber(sanitized);
      setErrors(prev => ({ ...prev, cardNumber: validation.valid ? null : validation.error }));
    } else {
      setErrors(prev => ({ ...prev, cardNumber: null }));
    }
  };

  const handleCvvChange = (e) => {
    const sanitized = sanitizeNumeric(e.target.value);
    setCvv(sanitized);
    if (sanitized.length >= 3) {
      const validation = validateCVV(sanitized);
      setErrors(prev => ({ ...prev, cvv: validation.valid ? null : validation.error }));
    } else {
      setErrors(prev => ({ ...prev, cvv: null }));
    }
  };

  const handleExpMonthChange = (e) => {
    const sanitized = sanitizeNumeric(e.target.value);
    setExpMonth(sanitized);
    if (sanitized.length === 2 && expYear) {
      const validation = validateExpiryDate(sanitized, expYear);
      setErrors(prev => ({ ...prev, expiry: validation.valid ? null : validation.error }));
    } else {
      setErrors(prev => ({ ...prev, expiry: null }));
    }
  };

  const handleExpYearChange = (e) => {
    const sanitized = sanitizeNumeric(e.target.value);
    setExpYear(sanitized);
    if (expMonth && sanitized.length === 4) {
      const validation = validateExpiryDate(expMonth, sanitized);
      setErrors(prev => ({ ...prev, expiry: validation.valid ? null : validation.error }));
    } else {
      setErrors(prev => ({ ...prev, expiry: null }));
    }
  };

  const handlePhoneChange = (e) => {
    const sanitized = sanitizeNumeric(e.target.value);
    setPhone(sanitized);
    if (sanitized.length === 10) {
      const validation = validatePhone(sanitized);
      setErrors(prev => ({ ...prev, phone: validation.valid ? null : validation.error }));
    } else {
      setErrors(prev => ({ ...prev, phone: null }));
    }
  };

  // Handler pour la sélection d'une adresse depuis l'autocomplétion
  const handleAddressSelect = (addressData) => {
    if (addressData.streetNumber) {
      setStreetNumber(addressData.streetNumber);
    }
    if (addressData.streetName) {
      setStreetName(addressData.streetName);
    }
    if (addressData.postalCode) {
      setPostalCode(addressData.postalCode);
    }
    setAddressValidated(true);
    setErrors(prev => ({ ...prev, address: null }));
  };

  // Helper pour afficher les erreurs de champ
  const FieldError = ({ error }) => {
    if (!error) return null;
    return (
      <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4, marginBottom: 0 }}>
        ⚠️ {error}
      </p>
    );
  };

  /** Redirection vers Stripe Checkout (paiement sécurisé, visible dans le Dashboard Stripe). */
  const handlePayWithStripe = async () => {
    if (!orderId || !order) return;
    setStripeRedirecting(true);
    setError("");
    try {
      const { url } = await api.createCheckoutSession(orderId);
      if (url) {
        window.location.href = url;
        return;
      }
      setError("Impossible de créer la session de paiement.");
    } catch (err) {
      setError(err?.message || "Erreur Stripe. Vérifiez la configuration (STRIPE_SECRET_KEY).");
    } finally {
      setStripeRedirecting(false);
    }
  };

  // Vérifier si le formulaire est valide pour activer/désactiver le bouton
  const isFormValid = cardNumber && cvv && expMonth && expYear && phone && addressValidated && streetNumber && streetName && postalCode;

  if (authLoading || loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Chargement...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="app-main">
        <div style={{ padding: 40, textAlign: "center" }}>
          <h2>Erreur</h2>
          <p style={{ color: "#dc2626" }}>{error}</p>
          <button
            onClick={() => navigate("/orders")}
            style={{
              padding: "12px 24px",
              backgroundColor: "#e8cfda",
              color: "#1a1a1a",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              marginTop: 16
            }}
          >
            Retour aux commandes
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="app-main">
        <div style={{ padding: 40, textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
          <h2 style={{ color: "#059669", marginBottom: 16 }}>
            Paiement réussi !
          </h2>
          <p style={{ color: "#374151", marginBottom: 24 }}>
            Votre commande a été payée avec succès.
          </p>
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            Redirection vers vos commandes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-main">
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ marginBottom: 8 }}>Paiement</h1>
        
        {order && (
          <div style={{ 
            backgroundColor: "#f0f9ff", 
            border: "1px solid #0ea5e9", 
            borderRadius: 8, 
            padding: 16, 
            marginBottom: 24 
          }}>
            <p style={{ margin: 0, color: "#0c4a6e", fontWeight: 600 }}>
              Commande #{order.id.slice(0, 8)}
            </p>
            <p style={{ margin: "4px 0 0 0", color: "#0c4a6e", fontSize: 14 }}>
              Total à payer : <strong>{fmt.format(order.total_cents / 100)}</strong>
            </p>
          </div>
        )}

        {/* Paiement Stripe Checkout (redirection vers Stripe, visible dans le Dashboard) */}
        <div style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={handlePayWithStripe}
            disabled={!order || stripeRedirecting || pending}
            className="btn-rose"
            style={{
              width: "100%",
              padding: "14px 20px",
              fontSize: 16,
              fontWeight: 600,
              opacity: (!order || stripeRedirecting || pending) ? 0.7 : 1,
              cursor: (!order || stripeRedirecting || pending) ? "not-allowed" : "pointer",
            }}
          >
            {stripeRedirecting ? "Redirection vers Stripe..." : `Payer avec Stripe — ${order ? fmt.format(order.total_cents / 100) : "—"}`}
          </button>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8, marginBottom: 0 }}>
            Vous serez redirigé vers la page de paiement sécurisée Stripe. Les paiements apparaissent dans le Dashboard Stripe.
          </p>
        </div>

        <div style={{ marginBottom: 16, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>— ou paiement par carte (simulation) —</div>

        <form onSubmit={handleSubmit}>
          {/* Numéro de carte */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
              Numéro de carte <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={cardNumber}
              onChange={handleCardNumberChange}
              placeholder="4242424242424242"
              maxLength={19}
              autoComplete="cc-number"
              pattern="[0-9]*"
              className="form-input"
              style={{
                border: `1px solid ${errors.cardNumber ? "#dc2626" : "#d1d5db"}`,
                backgroundColor: errors.cardNumber ? "#fef2f2" : "white"
              }}
            />
            <FieldError error={errors.cardNumber} />
            {!errors.cardNumber && (
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4, marginBottom: 0 }}>
                💡 Pour tester : 4242424242424242 (accepté) ou ...0000 (refusé)
              </p>
            )}
          </div>

          {/* Date d'expiration + CVV */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                Mois <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={expMonth}
                onChange={handleExpMonthChange}
                placeholder="MM"
                maxLength={2}
                autoComplete="cc-exp-month"
                pattern="[0-9]*"
                className="form-input"
                style={{
                  border: `1px solid ${errors.expiry ? "#dc2626" : "#d1d5db"}`,
                  backgroundColor: errors.expiry ? "#fef2f2" : "white"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                Année <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={expYear}
                onChange={handleExpYearChange}
                placeholder="AAAA"
                maxLength={4}
                autoComplete="cc-exp-year"
                pattern="[0-9]*"
                className="form-input"
                style={{
                  border: `1px solid ${errors.expiry ? "#dc2626" : "#d1d5db"}`,
                  backgroundColor: errors.expiry ? "#fef2f2" : "white"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                CVV <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={cvv}
                onChange={handleCvvChange}
                placeholder="123"
                maxLength={4}
                autoComplete="cc-csc"
                pattern="[0-9]*"
                className="form-input"
                style={{
                  border: `1px solid ${errors.cvv ? "#dc2626" : "#d1d5db"}`,
                  backgroundColor: errors.cvv ? "#fef2f2" : "white"
                }}
              />
            </div>
          </div>
          <FieldError error={errors.expiry} />
          <FieldError error={errors.cvv} />

          {/* Téléphone */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
              Téléphone <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="06 ou 07..."
              maxLength={10}
              autoComplete="tel"
              pattern="[0-9]*"
              className="form-input"
              style={{
                border: `1px solid ${errors.phone ? "#dc2626" : "#d1d5db"}`,
                backgroundColor: errors.phone ? "#fef2f2" : "white"
              }}
            />
            <FieldError error={errors.phone} />
          </div>

          {/* Adresse - Autocomplétion avec API gouvernementale - OBLIGATOIRE */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
              Adresse de livraison <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <AddressAutocomplete
              streetNumber={streetNumber}
              streetName={streetName}
              postalCode={postalCode}
              onSelect={handleAddressSelect}
              errors={errors}
              disabled={pending}
              required={true}
              isValidated={addressValidated}
            />
            {errors.address && (
              <FieldError error={errors.address} />
            )}
            {addressValidated && (
              <div style={{ 
                marginTop: 8, 
                padding: 8, 
                backgroundColor: "#f0fdf4", 
                border: "1px solid #10b981", 
                borderRadius: 6,
                fontSize: 13,
                color: "#065f46"
              }}>
                ✅ Adresse validée : {streetNumber} {streetName}, {postalCode}
              </div>
            )}
          </div>

          {/* Message d'erreur global */}
          {error && (
            <div style={{
              padding: 12,
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              color: "#dc2626",
              marginBottom: 16,
              fontSize: 14
            }}>
              {error}
            </div>
          )}

          {/* Boutons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
            <button
              type="button"
              onClick={() => navigate("/orders")}
              disabled={pending}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending || !isFormValid || !order}
              className="btn-rose"
              style={{
                opacity: (pending || !isFormValid || !order) ? 0.6 : 1,
                cursor: (pending || !isFormValid || !order) ? "not-allowed" : "pointer"
              }}
            >
              {pending ? "Traitement..." : order ? `Payer ${fmt.format(order.total_cents / 100)}` : "Chargement..."}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
