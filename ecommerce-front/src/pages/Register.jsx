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
import AddressAutocomplete from "../components/AddressAutocomplete";

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
  const [addressValidated, setAddressValidated] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
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
    if (!form.first_name || !form.last_name) {
      setErr("Le prénom et le nom sont obligatoires");
      setPending(false);
      return;
    }
    
    // Validation adresse
    if (manualMode) {
      if (!manualAddress || manualAddress.trim().length < 10 || !/\b\d{5}\b/.test(manualAddress)) {
        setErr("L'adresse doit contenir un code postal valide (5 chiffres). Ex: 12 rue de la Paix 75001 Paris");
        setPending(false);
        return;
      }
    } else if (!addressValidated || !form.postal_code) {
      setErr("Vous devez sélectionner une adresse depuis la recherche ci-dessus");
      setErrors({ ...errors, address: "Adresse requise - sélectionnez depuis la recherche" });
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
    const fullAddress = manualMode
      ? manualAddress.trim()
      : buildFullAddress(form.street_number, form.street_name, form.postal_code);
    
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
      setManualAddress("");
      setManualMode(false);
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
                  Adresse <span style={{ color: "#dc2626" }}>*</span>
                </label>

                {!manualMode ? (
                  <>
                    {/* Autocomplétion d'adresse avec API gouvernementale */}
                    <AddressAutocomplete
                      streetNumber={form.street_number}
                      streetName={form.street_name}
                      postalCode={form.postal_code}
                      onSelect={(addressData) => {
                        setForm({
                          ...form,
                          street_number: addressData.streetNumber || "",
                          street_name: addressData.streetName || "",
                          postal_code: addressData.postalCode || "",
                        });
                        setAddressValidated(true);
                        setErrors({ ...errors, address: null });
                      }}
                      onChange={onChange}
                      errors={errors}
                      required={true}
                      isValidated={addressValidated}
                    />

                    {errors.address && (
                      <small style={{ color: "#dc2626", fontSize: 12, display: "block", marginTop: 4 }}>
                        {errors.address}
                      </small>
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
                        ✅ Adresse validée : {form.street_number} {form.street_name}, {form.postal_code}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setManualMode(true)}
                      style={{ fontSize: 12, color: "#6b7280", cursor: "pointer", background: "none", border: "none", padding: "6px 0 0", display: "block", textDecoration: "underline" }}
                    >
                      Je ne trouve pas mon adresse, saisir manuellement
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="Ex: 12 rue de la Paix 75001 Paris"
                      className="form-input"
                    />
                    <small style={{ fontSize: 11, color: "#6b7280", display: "block", marginTop: 4 }}>
                      Incluez le numéro, le nom de rue et le code postal (5 chiffres obligatoire)
                    </small>
                    <button
                      type="button"
                      onClick={() => { setManualMode(false); setManualAddress(""); }}
                      style={{ fontSize: 12, color: "#6b7280", cursor: "pointer", background: "none", border: "none", padding: "6px 0 0", display: "block", textDecoration: "underline" }}
                    >
                      Utiliser la recherche automatique
                    </button>
                  </>
                )}
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
                <strong>Adresse</strong> — vous devez sélectionner une adresse depuis la recherche (API gouvernementale)
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
