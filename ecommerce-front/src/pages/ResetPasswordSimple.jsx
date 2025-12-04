// src/pages/ResetPasswordSimple.jsx
// Formulaire public: email + nouveau mot de passe (sans être connecté)
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function ResetPasswordSimple() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function isEmail(x) {
    return /\S+@\S+\.\S+/.test(x);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!isEmail(email)) return setError("Format d'email invalide");
    if (!pwd || pwd.length < 6) return setError("Mot de passe: 6 caractères minimum");
    if (pwd !== confirm) return setError("La confirmation ne correspond pas");
    try {
      setPending(true);
      await api.resetPasswordSimple({ email, new_password: pwd });
      setSuccess("Mot de passe réinitialisé. Vous pouvez vous connecter.");
      setEmail("");
      setPwd("");
      setConfirm("");
    } catch (err) {
      const msg = err?.message || "Échec de la réinitialisation";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Réinitialiser mon mot de passe</h2>
      <p style={{ color: "#666", marginBottom: 16 }}>Saisissez votre email et un nouveau mot de passe.</p>
      <form onSubmit={onSubmit} noValidate style={{ maxWidth: 380 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ex: imane@example.com"
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4, borderRadius: 4, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Nouveau mot de passe
          <input
            type="password"
            required
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Au moins 6 caractères"
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4, borderRadius: 4, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Confirmer le mot de passe
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4, borderRadius: 4, border: "1px solid #ccc" }}
          />
        </label>

        {error && (
          <p style={{ color: "tomato", marginBottom: 8, fontWeight: "bold" }}>{error}</p>
        )}
        {success && (
          <p style={{ color: "#065f46", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: 8, borderRadius: 6 }}>{success}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{ padding: "10px 16px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}
        >
          {pending ? "Réinitialisation…" : "Réinitialiser"}
        </button>

        <div style={{ marginTop: 12 }}>
          <Link to="/login" style={{ color: "#2563eb", textDecoration: "none", fontSize: 14 }}>Retour à la connexion</Link>
        </div>
      </form>
    </div>
  );
}


