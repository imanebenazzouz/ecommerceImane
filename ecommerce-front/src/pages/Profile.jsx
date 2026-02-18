// src/pages/Profile.jsx
//
// Page profil: affichage/modification du prénom, nom et adresse avec validations.
// Utilise des champs séparés pour l'adresse : numéro, code postal, nom de rue
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { 
  validateName, 
  validatePostalCode, 
  validateStreetNumber, 
  validateStreetName,
  buildFullAddress,
  parseAddress
} from "../utils/validations";
import AddressAutocomplete from "../components/AddressAutocomplete";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [errors, setErrors] = useState({});

  // Changement de mot de passe
  const [pwd, setPwd] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwdSaving, setPwdSaving] = useState(false);

  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    street_number: "",
    street_name: "",
    postal_code: "",
  });
  const [addressValidated, setAddressValidated] = useState(false);

  // Unauthorized UI (no token at all)
  const hasToken = !!localStorage.getItem("token");

  useEffect(() => {
    let ignore = false;
    async function fetchMe() {
      setLoading(true);
      setError("");
      setSuccess("");
      setErrors({});
      try {
        const me = await api.me();
        if (ignore) return;
        setUser(me);
        
        // Parser l'adresse existante pour remplir les champs séparés
        const parsedAddress = parseAddress(me.address || "");
        
        setForm({
          first_name: me.first_name || "",
          last_name: me.last_name || "",
          street_number: parsedAddress.streetNumber,
          street_name: parsedAddress.streetName,
          postal_code: parsedAddress.postalCode,
        });
        // Si l'adresse existe, on considère qu'elle était validée (anciennes données)
        setAddressValidated(!!me.address);
      } catch (err) {
        if (ignore) return;
        const msg = err?.message || "Erreur lors du chargement du profil";
        setError(msg);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    if (hasToken) fetchMe();
    else setLoading(false);
    return () => {
      ignore = true;
    };
  }, [hasToken]);

  function onChange(e) {
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
    
    setForm((f) => ({ ...f, [name]: filteredValue }));
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
    if (error) setError("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!hasToken) return; // guard
    
    setErrors({});
    
    // Validation côté client
    if (!form.first_name?.trim()) {
      setError("Le prénom est requis");
      return;
    }
    if (!form.last_name?.trim()) {
      setError("Le nom est requis");
      return;
    }
    // Validation adresse : doit être sélectionnée depuis l'API
    if (!addressValidated || !form.street_number?.trim() || !form.street_name?.trim() || !form.postal_code?.trim()) {
      setError("Vous devez sélectionner une adresse depuis la recherche ci-dessus");
      setErrors({ ...errors, address: "Adresse requise - sélectionnez depuis la recherche" });
      return;
    }
    
    // Valider le prénom (pas de chiffres)
    const firstNameValidation = validateName(form.first_name, "Prénom");
    if (!firstNameValidation.valid) {
      setErrors({ first_name: firstNameValidation.error });
      setError(firstNameValidation.error);
      return;
    }
    
    // Valider le nom (pas de chiffres)
    const lastNameValidation = validateName(form.last_name, "Nom");
    if (!lastNameValidation.valid) {
      setErrors({ last_name: lastNameValidation.error });
      setError(lastNameValidation.error);
      return;
    }
    
    // Valider le numéro de rue
    const streetNumberValidation = validateStreetNumber(form.street_number);
    if (!streetNumberValidation.valid) {
      setErrors({ street_number: streetNumberValidation.error });
      setError(streetNumberValidation.error);
      return;
    }
    
    // Valider le nom de rue
    const streetNameValidation = validateStreetName(form.street_name);
    if (!streetNameValidation.valid) {
      setErrors({ street_name: streetNameValidation.error });
      setError(streetNameValidation.error);
      return;
    }
    
    // Valider le code postal
    const postalCodeValidation = validatePostalCode(form.postal_code);
    if (!postalCodeValidation.valid) {
      setErrors({ postal_code: postalCodeValidation.error });
      setError(postalCodeValidation.error);
      return;
    }
    
    // Reconstruire l'adresse complète pour le backend
    const fullAddress = buildFullAddress(form.street_number, form.street_name, form.postal_code);
    
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await api.updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        address: fullAddress,
      });
      setUser(updated);
      
      // Parser l'adresse mise à jour
      const parsedAddress = parseAddress(updated.address || "");
      
      setForm({
        first_name: updated.first_name || "",
        last_name: updated.last_name || "",
        street_number: parsedAddress.streetNumber,
        street_name: parsedAddress.streetName,
        postal_code: parsedAddress.postalCode,
      });
      setAddressValidated(!!updated.address);
      setSuccess("Profil mis à jour");
      setErrors({});
    } catch (err) {
      let msg = "Échec de la mise à jour";
      if (err?.message) msg = err.message;
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  // Not authenticated → friendly 401 panel
  if (!hasToken) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Mon profil</h2>
        <div
          style={{
            marginTop: 12,
            padding: 16,
            border: "1px solid #f3c6c6",
            background: "#fff5f5",
            borderRadius: 8,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>401</strong> – Vous devez être connecté pour accéder à cette page.
          </p>
          <p style={{ marginTop: 8 }}>
            <Link to="/login">Aller à la connexion</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Mon profil</h2>

      {loading && (
        <p aria-live="polite" style={{ color: "#555" }}>Chargement…</p>
      )}

      {!loading && error && (
        <div
          role="alert"
          style={{
            margin: "12px 0",
            padding: 12,
            border: "1px solid #f3c6c6",
            background: "#fff5f5",
            borderRadius: 8,
            color: "#b91c1c",
          }}
        >
          {error}
          {String(error).includes("401") && (
            <div style={{ marginTop: 8 }}>
              <Link to="/login">Se connecter</Link>
            </div>
          )}
        </div>
      )}

      {!loading && user && (
        <form onSubmit={onSubmit} noValidate style={{ maxWidth: 520 }}>
          <fieldset disabled={saving} style={{ border: "none", padding: 0, margin: 0 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <label>
                Email (lecture seule)
                <input
                  type="email"
                  value={user.email || ""}
                  readOnly
                  aria-readonly="true"
                  style={inputStyle}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label>
                  Prénom <span style={{ color: "#dc2626" }}>*</span>
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={onChange}
                    onKeyPress={(e) => {
                      // Bloquer les chiffres et symboles (sauf espaces, tirets, apostrophes)
                      if (/[0-9@#$%^&*()_+=\[\]{}|;:"<>?\\\/]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    style={errors.first_name ? { ...inputStyle, border: "1px solid #dc2626", backgroundColor: "#fef2f2" } : inputStyle}
                    placeholder="Votre prénom"
                    autoComplete="given-name"
                  />
                  {errors.first_name && <small style={{ color: "#dc2626", fontSize: 12 }}>{errors.first_name}</small>}
                </label>
                <label>
                  Nom <span style={{ color: "#dc2626" }}>*</span>
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={onChange}
                    onKeyPress={(e) => {
                      // Bloquer les chiffres et symboles (sauf espaces, tirets, apostrophes)
                      if (/[0-9@#$%^&*()_+=\[\]{}|;:"<>?\\\/]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    style={errors.last_name ? { ...inputStyle, border: "1px solid #dc2626", backgroundColor: "#fef2f2" } : inputStyle}
                    placeholder="Votre nom"
                    autoComplete="family-name"
                  />
                  {errors.last_name && <small style={{ color: "#dc2626", fontSize: 12 }}>{errors.last_name}</small>}
                </label>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Adresse <span style={{ color: "#dc2626" }}>*</span>
                </label>
                
                {/* Autocomplétion d'adresse avec API gouvernementale - OBLIGATOIRE */}
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
                    // Effacer les erreurs
                    setErrors({ ...errors, address: null });
                  }}
                  onChange={onChange}
                  errors={errors}
                  disabled={saving}
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
              </div>

              <div>
                <span style={{ fontSize: 14, color: "#555" }}>
                  Rôle: <strong>{user.is_admin ? "admin" : "client"}</strong>
                </span>
              </div>

              {success && (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    padding: 10,
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#065f46",
                    borderRadius: 6,
                  }}
                >
                  {success}
                </div>
              )}

              {error && !loading && (
                <div
                  role="alert"
                  style={{
                    padding: 10,
                    background: "#fff5f5",
                    border: "1px solid #f3c6c6",
                    color: "#b91c1c",
                    borderRadius: 6,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={buttonPrimary}
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
                <small style={{ color: "#6b7280" }}>
                  Seuls prénom, nom et adresse sont modifiables.
                </small>
              </div>
            </div>
          </fieldset>
        </form>
      )}

      {/* Bloc changement de mot de passe */}
      {!loading && user && (
        <div style={{ maxWidth: 520, marginTop: 24 }}>
          <h3 id="change-password" style={{ marginBottom: 12 }}>Changer mon mot de passe</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <label>
              Ancien mot de passe
              <input
                type="password"
                value={pwd.current_password}
                onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })}
                style={inputStyle}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>
            <label>
              Nouveau mot de passe
              <input
                type="password"
                value={pwd.new_password}
                onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })}
                style={inputStyle}
                placeholder="Au moins 6 caractères"
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirmer le nouveau mot de passe
              <input
                type="password"
                value={pwd.confirm_password}
                onChange={(e) => setPwd({ ...pwd, confirm_password: e.target.value })}
                style={inputStyle}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </label>

            <div>
              <button
                type="button"
                disabled={pwdSaving}
                onClick={async () => {
                  try {
                    setError("");
                    setSuccess("");
                    if (!pwd.current_password || !pwd.new_password) {
                      setError("Tous les champs mot de passe sont requis");
                      return;
                    }
                    if (pwd.new_password.length < 6) {
                      setError("Le nouveau mot de passe doit contenir au moins 6 caractères");
                      return;
                    }
                    if (pwd.new_password !== pwd.confirm_password) {
                      setError("La confirmation ne correspond pas");
                      return;
                    }
                    setPwdSaving(true);
                    await api.changePassword({ current_password: pwd.current_password, new_password: pwd.new_password });
                    setSuccess("Mot de passe mis à jour");
                    setPwd({ current_password: "", new_password: "", confirm_password: "" });
                  } catch (e) {
                    const msg = e?.message || "Échec du changement de mot de passe";
                    setError(msg);
                  } finally {
                    setPwdSaving(false);
                  }
                }}
                style={buttonPrimary}
              >
                {pwdSaving ? "Modification…" : "Mettre à jour le mot de passe"}
              </button>
            </div>
          </div>
        </div>
      )}
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

const buttonPrimary = {
  padding: "10px 16px",
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: "bold",
};