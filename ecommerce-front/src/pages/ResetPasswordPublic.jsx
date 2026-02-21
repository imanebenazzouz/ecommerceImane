// src/pages/ResetPasswordPublic.jsx
// Page publique : réinitialiser son mot de passe quand on n'est pas connecté
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function ResetPasswordPublic() {
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
      setSuccess("Mot de passe modifié. Vous pouvez vous connecter.");
      setEmail("");
      setPwd("");
      setConfirm("");
    } catch (err) {
      setError(err?.message || "Échec de la réinitialisation. Vérifiez votre email.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-card auth-card--frosted" style={{ maxWidth: 400 }}>
          <h2>Modifier mon mot de passe</h2>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>
            Saisissez votre email et choisissez un nouveau mot de passe.
          </p>

          <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 14 }}>
            <label>
              <span className="form-label">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: imane@example.com"
                className="form-input"
              />
            </label>

            <label>
              <span className="form-label">Nouveau mot de passe</span>
              <input
                type="password"
                required
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Au moins 6 caractères"
                className="form-input"
                autoComplete="new-password"
              />
            </label>

            <label>
              <span className="form-label">Confirmer le mot de passe</span>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                autoComplete="new-password"
              />
            </label>

            {error && (
              <div style={{ padding: 10, background: "#fff5f5", border: "1px solid #f3c6c6", borderRadius: 6, color: "#b91c1c", fontSize: 14 }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ padding: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 6, color: "#065f46", fontSize: 14 }}>
                {success}{" "}
                <Link to="/login" style={{ color: "#065f46", fontWeight: 600 }}>Se connecter</Link>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="btn btn-rose btn-lg"
            >
              {pending ? "Modification…" : "Modifier le mot de passe"}
            </button>

            <div style={{ textAlign: "center", marginTop: 4 }}>
              <Link to="/login" style={{ color: "#6b7280", fontSize: 14 }}>
                ← Retour à la connexion
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
