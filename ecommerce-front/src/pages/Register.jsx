// src/pages/Register.jsx
//
// Page d'inscription avec validations de nom et d'adresse côté client.
// Utilise des champs séparés pour l'adresse : numéro, code postal, nom de rue
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { 
  validateName, 
  validatePostalCode, 
  validateStreetNumber, 
  validateStreetName,
  buildFullAddress
} from "../utils/validations";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    email:"", 
    password:"", 
    confirm:"", 
    first_name:"", 
    last_name:"", 
    street_number:"",
    street_name:"",
    postal_code:""
  });
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState(""); 
  const [ok, setOk] = useState("");
  const [pending, setPending] = useState(false);

  const isEmail = (x) => /\S+@\S+\.\S+/.test(x);
  const isStrong = (x) => x.length >= 8 && /[A-Z]/.test(x) && /[a-z]/.test(x) && /\d/.test(x);

  async function submit(e){
    e.preventDefault(); 
    setErr(""); 
    setOk("");
    setErrors({});
    setPending(true);
    
    // Validation email
    if (!isEmail(form.email)) {
      setErr("Email invalide");
      setPending(false);
      return;
    }
    
    // Validation mot de passe
    if (!isStrong(form.password)) {
      setErr("Mot de passe faible (8+, maj, min, chiffre)");
      setPending(false);
      return;
    }
    
    if (form.password !== form.confirm) {
      setErr("Les mots de passe ne correspondent pas");
      setPending(false);
      return;
    }
    
    // Validation champs obligatoires
    if (!form.first_name || !form.last_name || !form.street_number || !form.street_name || !form.postal_code) {
      setErr("Tous les champs sont obligatoires");
      setPending(false);
      return;
    }
    
    // Validation prénom
    const firstNameValidation = validateName(form.first_name, "Prénom");
    if (!firstNameValidation.valid) {
      setErrors({ first_name: firstNameValidation.error });
      setErr(firstNameValidation.error);
      setPending(false);
      return;
    }
    
    // Validation nom
    const lastNameValidation = validateName(form.last_name, "Nom");
    if (!lastNameValidation.valid) {
      setErrors({ last_name: lastNameValidation.error });
      setErr(lastNameValidation.error);
      setPending(false);
      return;
    }
    
    // Validation numéro de rue
    const streetNumberValidation = validateStreetNumber(form.street_number);
    if (!streetNumberValidation.valid) {
      setErrors({ street_number: streetNumberValidation.error });
      setErr(streetNumberValidation.error);
      setPending(false);
      return;
    }
    
    // Validation nom de rue
    const streetNameValidation = validateStreetName(form.street_name);
    if (!streetNameValidation.valid) {
      setErrors({ street_name: streetNameValidation.error });
      setErr(streetNameValidation.error);
      setPending(false);
      return;
    }
    
    // Validation code postal
    const postalCodeValidation = validatePostalCode(form.postal_code);
    if (!postalCodeValidation.valid) {
      setErrors({ postal_code: postalCodeValidation.error });
      setErr(postalCodeValidation.error);
      setPending(false);
      return;
    }
    
    // Reconstruire l'adresse complète pour le backend
    const fullAddress = buildFullAddress(form.street_number, form.street_name, form.postal_code);
    
    try {
      await api.register({
        email: form.email, 
        password: form.password,
        first_name: form.first_name, 
        last_name: form.last_name, 
        address: fullAddress,
      });
      setOk("Compte créé avec succès ! Redirection..."); 
      setForm({ 
        email:"", 
        password:"", 
        confirm:"", 
        first_name:"", 
        last_name:"", 
        street_number:"",
        street_name:"",
        postal_code:""
      });
      setErrors({});
      
      // Redirection vers la page de connexion après 1.5 secondes
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch(e){ 
      let errorMessage = "Erreur lors de l'inscription, veuillez réessayer.";
      
      if (e?.message) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      } else if (e?.toString) {
        errorMessage = e.toString();
      }
      
      setErr(errorMessage); 
    } finally {
      setPending(false);
    }
  }

  function onChange(e){ 
    const { name, value } = e.target;
    
    // Filtrer les caractères selon le type de champ
    let filteredValue = value;
    
    if (name === 'street_number' || name === 'postal_code') {
      // Seulement des chiffres pour numéro et code postal
      filteredValue = value.replace(/\D/g, '');
    } else if (name === 'first_name' || name === 'last_name') {
      // Seulement lettres, espaces, tirets, apostrophes pour nom/prénom
      // Pas de chiffres ni symboles
      filteredValue = value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');
    }
    
    setForm({ ...form, [name]: filteredValue });
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
    if (err) setErr("");
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-grid">
          <div className="auth-card auth-card--frosted">
            <h2>S&apos;inscrire</h2>

            {ok && <div className="message message-success">{ok}</div>}
            {err && <div className="message message-error">{err}</div>}

            <form onSubmit={submit} noValidate className="auth-form">
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={onChange}
                  placeholder="ex: imane@example.com"
                  className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                />
                {errors.email && <small style={{ color: "#dc2626", fontSize: 12, display: "block", marginTop: 4 }}>{errors.email}</small>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="first_name">
                    Prénom
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    required
                    value={form.first_name}
                    onChange={onChange}
                    onKeyPress={(e) => {
                      if (/[0-9@#$%^&*()_+=\[\]{}|;:"<>?\\\/]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="Jean"
                    autoComplete="given-name"
                    className={`form-input ${errors.first_name ? 'form-input--error' : ''}`}
                  />
                  {errors.first_name && <small style={{ color: "#dc2626", fontSize: 12, display: "block", marginTop: 4 }}>{errors.first_name}</small>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="last_name">
                    Nom
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    required
                    value={form.last_name}
                    onChange={onChange}
                    onKeyPress={(e) => {
                      if (/[0-9@#$%^&*()_+=\[\]{}|;:"<>?\\\/]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="Dupont"
                    autoComplete="family-name"
                    className={`form-input ${errors.last_name ? 'form-input--error' : ''}`}
                  />
                  {errors.last_name && <small style={{ color: "#dc2626", fontSize: 12, display: "block", marginTop: 4 }}>{errors.last_name}</small>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: "var(--space-2)" }}>
                  Adresse
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 120px", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                  <div>
                    <label className="form-label" htmlFor="street_number" style={{ fontSize: "var(--text-sm)" }}>
                      Numéro
                    </label>
                    <input
                      id="street_number"
                      name="street_number"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={form.street_number}
                      onChange={onChange}
                      onKeyPress={(e) => {
                        if (!/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      placeholder="12"
                      autoComplete="off"
                      maxLength={10}
                      className={`form-input ${errors.street_number ? 'form-input--error' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="street_name" style={{ fontSize: "var(--text-sm)" }}>
                      Nom de rue
                    </label>
                    <input
                      id="street_name"
                      name="street_name"
                      type="text"
                      required
                      value={form.street_name}
                      onChange={onChange}
                      placeholder="Rue de la Paix"
                      autoComplete="street-address"
                      maxLength={100}
                      className={`form-input ${errors.street_name ? 'form-input--error' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="postal_code" style={{ fontSize: "var(--text-sm)" }}>
                      Code postal
                    </label>
                    <input
                      id="postal_code"
                      name="postal_code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={form.postal_code}
                      onChange={onChange}
                      onKeyPress={(e) => {
                        if (!/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      placeholder="75001"
                      autoComplete="postal-code"
                      maxLength={5}
                      className={`form-input ${errors.postal_code ? 'form-input--error' : ''}`}
                    />
                  </div>
                </div>
                {errors.street_number && <small style={{ color: "#dc2626", fontSize: 12, display: "block", marginBottom: 4 }}>{errors.street_number}</small>}
                {errors.street_name && <small style={{ color: "#dc2626", fontSize: 12, display: "block", marginBottom: 4 }}>{errors.street_name}</small>}
                {errors.postal_code && <small style={{ color: "#dc2626", fontSize: 12, display: "block", marginBottom: 4 }}>{errors.postal_code}</small>}
                <small style={{ fontSize: 12, color: "var(--muted)", display: "block", marginTop: 4 }}>
                  💡 Exemple : 12 | Rue de la Paix | 75001
                </small>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="password">
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={form.password}
                    onChange={onChange}
                    placeholder="Min. 8 caractères"
                    autoComplete="new-password"
                    className="form-input"
                  />
                  <small style={{ fontSize: 12, color: "var(--muted)", display: "block", marginTop: 4 }}>
                    Min. 8 caractères, majuscule, minuscule, chiffre
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="confirm">
                    Confirmer
                  </label>
                  <input
                    id="confirm"
                    name="confirm"
                    type="password"
                    required
                    value={form.confirm}
                    onChange={onChange}
                    placeholder="Confirmer le mot de passe"
                    autoComplete="new-password"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="auth-actions">
                <button type="submit" className="btn btn-rose btn-lg" disabled={pending}>
                  {pending ? "Création..." : "Créer mon compte"}
                </button>
                <Link to="/login" className="btn btn-rose btn-lg auth-actions__secondary">
                  Se connecter
                </Link>
              </div>
            </form>
          </div>

          <div className="auth-note">
            <div className="auth-note__title">💡 Informations</div>
            <ul className="auth-note__list">
              <li className="auth-note__item">
                <strong>Mot de passe</strong> — minimum 8 caractères avec majuscule, minuscule et chiffre
              </li>
              <li className="auth-note__item">
                <strong>Adresse</strong> — tous les champs sont obligatoires pour la livraison
              </li>
              <li className="auth-note__item">
                <strong>Déjà un compte ?</strong> — connectez-vous directement
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
