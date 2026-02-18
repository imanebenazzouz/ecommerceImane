// src/pages/PaymentSuccess.jsx
// Page de retour après paiement Stripe Checkout (succès).

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import "../styles/global.css";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [errorMessage, setErrorMessage] = useState("");

  const sessionId = searchParams.get("session_id");
  const [networkError, setNetworkError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const verifySession = React.useCallback(async () => {
    if (!sessionId) return;
    setStatus("loading");
    setVerifying(true);
    setNetworkError(false);
    try {
      const result = await api.stripeVerifySession(sessionId);
      if (result?.success) {
        setStatus("success");
        setTimeout(() => navigate("/orders"), 2500);
      } else {
        setStatus("error");
        setErrorMessage("Impossible de finaliser la commande.");
      }
    } catch (err) {
      setStatus("error");
      const msg = err?.message || "Erreur lors de la vérification du paiement.";
      setErrorMessage(msg);
      setNetworkError(err?.status === 0 || /fetch|joindre le serveur|network/i.test(String(msg)));
    } finally {
      setVerifying(false);
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated()) {
      navigate("/login?next=/payment/success");
      return;
    }
    if (!sessionId) {
      setStatus("error");
      setErrorMessage("Paramètre session_id manquant.");
      return;
    }
    setNetworkError(false);
    verifySession();
  }, [sessionId, isAuthenticated, authLoading, navigate, verifySession]);

  if (authLoading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p className="loading-text">Chargement...</p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="app-main">
        <div style={{ padding: 40, textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
          <div className="loading-spinner" style={{ margin: "0 auto 16px" }} />
          <p>Vérification du paiement en cours...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="app-main">
        <div style={{ padding: 40, textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
          <p style={{ color: "#dc2626", marginBottom: 16 }}>{errorMessage}</p>
          {networkError && (
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
              Vérifiez que le backend est bien démarré (port 8000). Vous pouvez réessayer ci-dessous.
            </p>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {networkError && (
              <button
                type="button"
                onClick={() => verifySession()}
                disabled={verifying}
                className="btn-rose"
              >
                {verifying ? "Vérification..." : "Réessayer la vérification"}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="btn-rose"
              style={networkError ? { background: "#6b7280" } : {}}
            >
              Retour aux commandes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-main">
      <div style={{ padding: 40, textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
        <h2 style={{ color: "#059669", marginBottom: 16 }}>Paiement réussi</h2>
        <p style={{ color: "#374151", marginBottom: 24 }}>
          Votre commande a été payée avec succès. Vous allez être redirigé vers vos commandes.
        </p>
        <p style={{ fontSize: 14, color: "#6b7280" }}>Redirection...</p>
      </div>
    </div>
  );
}
