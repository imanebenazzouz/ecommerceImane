// src/pages/ResetPasswordSimple.jsx
// Page admin uniquement : réinitialiser le mot de passe d'un utilisateur par email
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
    if (!pwd || pwd.length < 6) return setError("Mot de passe : 6 caractères minimum");
    if (pwd !== confirm) return setError("La confirmation ne correspond pas");
    try {
      setPending(true);
      await api.resetPasswordSimple({ email, new_password: pwd });
      setSuccess(`Mot de passe réinitialisé pour ${email}.`);
      setEmail("");
      setPwd("");
      setConfirm("");
    } catch (err) {
      setError(err?.message || "Échec de la réinitialisation");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/admin" style={{ color: "#2563eb", fontSize: 14 }}>← Retour à l'admin</Link>
      </div>

      <h2 style={{ marginBottom: 4 }}>Réinitialiser le mot de passe d'un utilisateur</h2>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
        Action réservée aux administrateurs. Saisissez l'email du compte et le nouveau mot de passe.
      </p>

      <form onSubmit={onSubmit} noValidate style={{ maxWidth: 380 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <label>
            Email du compte
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="utilisateur@example.com"
              style={inputStyle}
            />
          </label>

          <label>
            Nouveau mot de passe
            <input
              type="password"
              required
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Au moins 6 caractères"
              style={inputStyle}
            />
          </label>

          <label>
            Confirmer le mot de passe
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </label>

          {error && (
            <div style={{ padding: 10, background: "#fff5f5", border: "1px solid #f3c6c6", borderRadius: 6, color: "#b91c1c", fontSize: 14 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 6, color: "#065f46", fontSize: 14 }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{ padding: "10px 16px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
          >
            {pending ? "Réinitialisation…" : "Réinitialiser le mot de passe"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  padding: 10,
  marginTop: 4,
  borderRadius: 6,
  border: "1px solid #d1d5db",
  fontSize: 14,
};
